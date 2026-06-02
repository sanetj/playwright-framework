import { AuthorizationPairInventory, AuthorizationPair } from './authorization-pairing';
import { ReplayCandidateInventory, ReplayCandidate } from './replay-candidate';
import { VerificationBlueprint, VerificationBlueprintInventory } from './verification-blueprint';
import { AuthorizationVector } from './authorization-vector';
import { isUnresolvedIdentity } from './ownership-intelligence';
import { sanitizeResourceFamily } from './resource-analysis-utils';

export class VerificationPlanner {
  /**
   * Translates AuthorizationPairInventory and ReplayCandidateInventory into
   * a stable, deterministic VerificationBlueprintInventory.
   */
  public planVerification(
    pairInventory: AuthorizationPairInventory,
    candidateInventory: ReplayCandidateInventory
  ): VerificationBlueprintInventory {
    const blueprintsMap = new Map<string, VerificationBlueprint>();

    // Fast lookup index: ReplayCandidates grouped by candidateId
    const candidatesById = new Map<string, ReplayCandidate>();
    for (const cand of candidateInventory.candidates) {
      candidatesById.set(cand.candidateId, cand);
    }

    // Process each AuthorizationPair
    for (const pair of pairInventory.pairs) {
      // 1. Exclusion Check: AuthorizationPair or its baseline reference missing
      if (!pair || !pair.baselineExchangeId) {
        continue;
      }

      // 2. Exclusion Check: Unresolved identities (raw sessions starting with usr_sess_ or usr_session_)
      if (isUnresolvedIdentity(pair.subjectId) || isUnresolvedIdentity(pair.ownerId)) {
        continue;
      }

      // 3. Exclusion Check: Resource integrity check
      if (!pair.resourceInstanceKey || !pair.targetResourceFamily || !pair.targetResourceId) {
        continue;
      }

      // 4. Resolve matching ReplayCandidate
      const candidate = candidatesById.get(pair.replayCandidateId);
      if (!candidate) {
        // Exclusion Check: ReplayCandidate missing
        continue;
      }

      // 5. Build human-readable deterministic blueprint ID
      const sanitizedFamily = sanitizeResourceFamily(pair.targetResourceFamily);
      const blueprintId = `bp_${pair.vector}_${pair.subjectId}_${sanitizedFamily}::${pair.targetResourceId}`;

      // Invariant: One Authorization Opportunity = One Blueprint (Deduplication)
      if (!blueprintsMap.has(blueprintId)) {
        blueprintsMap.set(blueprintId, {
          blueprintId,
          vector: pair.vector,
          authorizationPairId: pair.pairId,
          replayCandidateId: pair.replayCandidateId,
          baselineExchangeId: pair.baselineExchangeId,
          subjectId: pair.subjectId,
          ownerId: pair.ownerId,
          resourceInstanceKey: pair.resourceInstanceKey,
          targetResourceFamily: pair.targetResourceFamily,
          targetResourceId: pair.targetResourceId,
          authorizationSurface: pair.targetSurface,
          mutationTargets: Object.freeze([...candidate.parameterTargets]),
          headerTargets: Object.freeze([...candidate.headerTargets])
        });
      }
    }

    // Extract deduplicated blueprints
    const blueprints = Array.from(blueprintsMap.values());

    // Stable sort alphabetically by blueprintId to guarantee 100% determinism
    blueprints.sort((a, b) => a.blueprintId.localeCompare(b.blueprintId));

    // Group index initialization
    const blueprintsByVector: Record<AuthorizationVector, VerificationBlueprint[]> = {
      IDOR: [],
      BAC: [],
      TENANT_ISOLATION: []
    };

    const blueprintsBySubject: Record<string, VerificationBlueprint[]> = {};

    for (const bp of blueprints) {
      blueprintsByVector[bp.vector].push(bp);

      if (!blueprintsBySubject[bp.subjectId]) {
        blueprintsBySubject[bp.subjectId] = [];
      }
      blueprintsBySubject[bp.subjectId].push(bp);
    }

    // Sort grouped lists to preserve determinism
    for (const vec of Object.keys(blueprintsByVector) as AuthorizationVector[]) {
      blueprintsByVector[vec].sort((a, b) => a.blueprintId.localeCompare(b.blueprintId));
    }
    for (const sub of Object.keys(blueprintsBySubject)) {
      blueprintsBySubject[sub].sort((a, b) => a.blueprintId.localeCompare(b.blueprintId));
    }

    // Deep freeze results to satisfy immutability invariants
    return Object.freeze({
      blueprints: Object.freeze(blueprints),
      blueprintsByVector: Object.freeze(blueprintsByVector),
      blueprintsBySubject: Object.freeze(blueprintsBySubject)
    });
  }


}
