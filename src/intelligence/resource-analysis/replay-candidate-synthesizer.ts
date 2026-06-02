import { ResourceSignal, ResourceSignalInventory } from './resource-signal';
import { ReplayCandidate, ReplayCandidateInventory } from './replay-candidate';
import { AuthorizationVector } from './authorization-vector';


export class ReplayCandidateSynthesizer {
  /**
   * Passive candidate generation translating resource signals into structured replay candidates.
   * Maps dynamic parameters and headers for each vulnerability vector context.
   */
  public synthesize(inventory: ResourceSignalInventory): ReplayCandidateInventory {
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

    // Sort flat signals array alphabetically by candidateId to ensure determinism
    candidates.sort((a, b) => a.candidateId.localeCompare(b.candidateId));

    // Group by targeted vector
    const candidatesByVector: Record<AuthorizationVector, ReplayCandidate[]> = {
      IDOR: [],
      BAC: [],
      TENANT_ISOLATION: []
    };

    for (const cand of candidates) {
      candidatesByVector[cand.targetVector].push(cand);
    }

    // Group by logical surface context
    const candidatesBySurface: Record<string, ReplayCandidate[]> = {};
    for (const cand of candidates) {
      if (!candidatesBySurface[cand.authorizationSurface]) {
        candidatesBySurface[cand.authorizationSurface] = [];
      }
      candidatesBySurface[cand.authorizationSurface].push(cand);
    }

    // Sort grouped collections to guarantee stable byte-identical outputs
    for (const vectorName of Object.keys(candidatesByVector) as AuthorizationVector[]) {
      candidatesByVector[vectorName].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    }
    for (const surfaceName of Object.keys(candidatesBySurface)) {
      candidatesBySurface[surfaceName].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    }

    return {
      candidates,
      candidatesByVector,
      candidatesBySurface
    };
  }
}
