import { ResourceSignal, ResourceSignalInventory } from './resource-signal';
import { ReplayCandidate, ReplayCandidateInventory } from './replay-candidate';
import { AuthorizationVector } from './authorization-vector';
import { OwnershipInventory } from './ownership-intelligence';


export class ReplayCandidateSynthesizer {
  /**
   * Passive candidate generation translating resource signals into structured replay candidates.
   * Maps dynamic parameters and headers for each vulnerability vector context.
   */
  public synthesize(
    inventory: ResourceSignalInventory,
    ownership?: OwnershipInventory,
    replayActorSessionId?: string
  ): ReplayCandidateInventory {
    const candidates: ReplayCandidate[] = [];

    for (const sig of inventory.signals) {
      if (sig.evidenceExchangeIds.length === 0) continue;

      // Deterministic baseline selection: first sorted exchange ID
      const sortedExchanges = [...sig.evidenceExchangeIds].sort();
      const baselineExchangeId = sortedExchanges[0];

      // 1. IDOR Candidate Synthesis
      const isIdorTriggered =
        sig.investigationSignals.includes('OBJECT_IDENTIFIER_PRESENT') &&
        (sig.primaryType === 'DOCUMENT' || sig.primaryType === 'USER' || sig.primaryType === 'BILLING');

      if (isIdorTriggered) {
        const parameterTargets: string[] = [];
        
        // Match dynamic parameter tokens from family mapping generically
        const pathParamRegex = /:([a-zA-Z0-9_]+)/g;
        let match;
        while ((match = pathParamRegex.exec(sig.resourceFamily)) !== null) {
          if (!parameterTargets.includes(match[1])) {
            parameterTargets.push(match[1]);
          }
        }

        // Match parameters containing identification markers
        for (const p of sig.parameterSignature) {
          const lower = p.toLowerCase();
          if (lower.includes('id') || lower.includes('uuid')) {
            if (!parameterTargets.includes(p)) {
              parameterTargets.push(p);
            }
          }
        }

        candidates.push({
          candidateId: `cand_IDOR_${sig.resourceSignature}`,
          resourceFamily: sig.resourceFamily,
          httpMethod: sig.httpMethod,
          authorizationSurface: sig.authorizationSurface,
          targetVector: 'IDOR',
          baselineExchangeId,
          parameterTargets: parameterTargets.sort(),
          headerTargets: ['cookie'],
          synthesisReasons: ['IDOR_PARAMETER_EXPOSED']
        });
      }

      // 2. BAC Candidate Synthesis
      const hasCrossRole = sig.investigationSignals.includes('CROSS_ROLE_VISIBLE');
      const hasBoundary = sig.investigationSignals.includes('BOUNDARY_ADJACENT');

      if (hasCrossRole || hasBoundary) {
        const synthesisReasons: string[] = [];
        if (hasCrossRole) synthesisReasons.push('PRIVILEGE_DIVERGENCE_OPPORTUNITY');
        if (hasBoundary) synthesisReasons.push('RESTRICTED_BOUNDARY_ADJACENT');

        candidates.push({
          candidateId: `cand_BAC_${sig.resourceSignature}`,
          resourceFamily: sig.resourceFamily,
          httpMethod: sig.httpMethod,
          authorizationSurface: sig.authorizationSurface,
          targetVector: 'BAC',
          baselineExchangeId,
          parameterTargets: [],
          headerTargets: ['cookie'],
          synthesisReasons: synthesisReasons.sort()
        });
      }

      // 3. Tenant Isolation Candidate Synthesis
      const isTenantTriggered =
        sig.investigationSignals.includes('TENANT_SCOPED') || sig.primaryType === 'TENANT';

      if (isTenantTriggered) {
        const parameterTargets: string[] = [];
        const tenantKeywords = [
          'tenant',
          'org',
          'company',
          'organization',
          'workspace',
          'account',
          'team',
          'group',
          'customer',
          'business'
        ];
        for (const p of sig.parameterSignature) {
          const lower = p.toLowerCase();
          if (tenantKeywords.some(k => lower.includes(k))) {
            parameterTargets.push(p);
          }
        }

        const headerTargets = ['cookie', 'x-tenant-id'];

        candidates.push({
          candidateId: `cand_TENANT_ISOLATION_${sig.resourceSignature}`,
          resourceFamily: sig.resourceFamily,
          httpMethod: sig.httpMethod,
          authorizationSurface: sig.authorizationSurface,
          targetVector: 'TENANT_ISOLATION',
          baselineExchangeId,
          parameterTargets: parameterTargets.sort(),
          headerTargets: headerTargets.sort(),
          synthesisReasons: ['TENANT_PARTITION_EXPOSED']
        });
      }
    }

    // Phase 12.8 Ownership Intelligence Prioritization
    let replayActorProfileId: string | undefined;

    if (ownership && replayActorSessionId) {
      for (const p of ownership.profiles) {
        if (p.sessionIds.includes(replayActorSessionId)) {
          replayActorProfileId = p.resolvedId;
          break;
        }
      }
    }

    const prioritizedCandidates: ReplayCandidate[] = [];

    for (const cand of candidates) {
      let multiplier = 1.0;
      let relation = 'UNKNOWN_OR_PUBLIC';

      if (ownership && replayActorProfileId) {
        // Attempt to find ownership mapping for this specific concrete resource execution
        // Since cand doesn't store the concrete ID directly, we resolve it based on the baseline exchange
        let targetOwnerIds: string[] | undefined;

        // The simplest way to evaluate ownership here is to check the resource family owners.
        // For precision, we look up the baselineExchangeId in ownership observations.
        const relevantObs = ownership.observations.find(
          o => o.baselineExchangeId === cand.baselineExchangeId && o.relationship === 'OWNS'
        );

        if (relevantObs) {
          const resourceKey = `${relevantObs.targetResourceFamily}::${relevantObs.targetResourceId}`;
          targetOwnerIds = ownership.resourceOwners[resourceKey];
        }

        if (targetOwnerIds && targetOwnerIds.length > 0) {
          if (targetOwnerIds.includes(replayActorProfileId)) {
            // Rule 2: Self-owner candidate
            multiplier = 0.1;
            relation = `SELF_OWNER: ${replayActorProfileId}`;
          } else {
            // Rule 1: Cross-owner candidate
            multiplier = 3.0;
            relation = `CROSS_OWNER: Target owned by [${targetOwnerIds.join(',')}] vs Actor ${replayActorProfileId}`;
          }
        }
      }

      prioritizedCandidates.push({
        ...cand,
        priorityMultiplier: multiplier,
        ownershipRelationship: relation
      });
    }

    // Zero Deletion Doctrine Proof
    const countBefore = prioritizedCandidates.length;

    // Sort: Primary by priorityMultiplier (descending), Secondary by candidateId (ascending/determinism)
    prioritizedCandidates.sort((a, b) => {
      const diff = (b.priorityMultiplier || 1.0) - (a.priorityMultiplier || 1.0);
      if (diff !== 0) return diff;
      return a.candidateId.localeCompare(b.candidateId);
    });

    const countAfter = prioritizedCandidates.length;
    if (countBefore !== countAfter) {
      throw new Error(`Zero Deletion Doctrine Violation: Candidate count altered during prioritization sorting (${countBefore} vs ${countAfter})`);
    }

    // Group by targeted vector
    const candidatesByVector: Record<AuthorizationVector, ReplayCandidate[]> = {
      IDOR: [],
      BAC: [],
      TENANT_ISOLATION: []
    };

    for (const cand of prioritizedCandidates) {
      candidatesByVector[cand.targetVector].push(cand);
    }

    // Group by logical surface context
    const candidatesBySurface: Record<string, ReplayCandidate[]> = {};
    for (const cand of prioritizedCandidates) {
      if (!candidatesBySurface[cand.authorizationSurface]) {
        candidatesBySurface[cand.authorizationSurface] = [];
      }
      candidatesBySurface[cand.authorizationSurface].push(cand);
    }

    // Sort grouped collections to guarantee stable byte-identical outputs
    for (const vectorName of Object.keys(candidatesByVector) as AuthorizationVector[]) {
      candidatesByVector[vectorName].sort((a, b) => {
        const diff = (b.priorityMultiplier || 1.0) - (a.priorityMultiplier || 1.0);
        if (diff !== 0) return diff;
        return a.candidateId.localeCompare(b.candidateId);
      });
    }
    for (const surfaceName of Object.keys(candidatesBySurface)) {
      candidatesBySurface[surfaceName].sort((a, b) => {
        const diff = (b.priorityMultiplier || 1.0) - (a.priorityMultiplier || 1.0);
        if (diff !== 0) return diff;
        return a.candidateId.localeCompare(b.candidateId);
      });
    }

    return {
      candidates: prioritizedCandidates,
      candidatesByVector,
      candidatesBySurface
    };
  }
}
