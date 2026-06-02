import { VerificationBlueprintInventory, VerificationBlueprint } from './verification-blueprint';
import { AuthorizationPairInventory, AuthorizationPair } from './authorization-pairing';
import { ReplayCandidateInventory, ReplayCandidate } from './replay-candidate';
import { InvestigationAssembly, InvestigationAssemblyInventory } from './investigation-assembly';
import { AuthorizationVector } from './authorization-vector';
import { isUnresolvedIdentity } from './ownership-intelligence';
import { sanitizeResourceFamily } from './resource-analysis-utils';

export class InvestigationAssembler {
  /**
   * Statelessly aggregates blueprints, pairs, and candidates into
   * a stable, deterministic, and reference-based InvestigationAssemblyInventory.
   */
  public assembleInvestigation(
    blueprintInventory: VerificationBlueprintInventory,
    pairInventory: AuthorizationPairInventory,
    candidateInventory: ReplayCandidateInventory
  ): InvestigationAssemblyInventory {
    const assembliesMap = new Map<string, InvestigationAssembly>();

    // Fast lookup index: AuthorizationPairs grouped by pairId
    const pairsById = new Map<string, AuthorizationPair>();
    for (const pair of pairInventory.pairs) {
      pairsById.set(pair.pairId, pair);
    }

    // Fast lookup index: ReplayCandidates grouped by candidateId
    const candidatesById = new Map<string, ReplayCandidate>();
    for (const cand of candidateInventory.candidates) {
      candidatesById.set(cand.candidateId, cand);
    }

    // Process each VerificationBlueprint
    for (const bp of blueprintInventory.blueprints) {
      // 1. Exclusion Check: Blueprint or its baseline template missing
      if (!bp || !bp.baselineExchangeId) {
        continue;
      }

      // 2. Exclusion Check: Unresolved identities (raw sessions starting with usr_sess_ or usr_session_)
      if (isUnresolvedIdentity(bp.subjectId) || isUnresolvedIdentity(bp.ownerId)) {
        continue;
      }

      // 3. Exclusion Check: Resource identity invalid
      if (!bp.resourceInstanceKey || !bp.targetResourceFamily || !bp.targetResourceId) {
        continue;
      }

      // 4. Resolve matching AuthorizationPair
      const pair = pairsById.get(bp.authorizationPairId);
      if (!pair) {
        continue;
      }

      // 5. Resolve matching ReplayCandidate
      const candidate = candidatesById.get(bp.replayCandidateId);
      if (!candidate) {
        continue;
      }

      // 6. Build deterministic, human-readable assembly ID
      const sanitizedFamily = sanitizeResourceFamily(bp.targetResourceFamily);
      const assemblyId = `asm_${bp.vector}_${bp.subjectId}_${sanitizedFamily}::${bp.targetResourceId}`;

      // Invariant: One Investigation = One Assembly (Deduplication)
      if (!assembliesMap.has(assemblyId)) {
        assembliesMap.set(assemblyId, {
          assemblyId,
          vector: bp.vector,
          subjectId: bp.subjectId,
          ownerId: bp.ownerId,
          resourceInstanceKey: bp.resourceInstanceKey,
          targetResourceFamily: bp.targetResourceFamily,
          targetResourceId: bp.targetResourceId,
          authorizationSurface: bp.authorizationSurface,
          authorizationPairId: bp.authorizationPairId,
          replayCandidateId: bp.replayCandidateId,
          blueprintId: bp.blueprintId,
          baselineExchangeId: bp.baselineExchangeId
        });
      }
    }

    // Extract deduplicated assemblies
    const assemblies = Array.from(assembliesMap.values());

    // Stable sort alphabetically by assemblyId to guarantee 100% determinism
    assemblies.sort((a, b) => a.assemblyId.localeCompare(b.assemblyId));

    // Group index initialization
    const assembliesByVector: Record<AuthorizationVector, InvestigationAssembly[]> = {
      IDOR: [],
      BAC: [],
      TENANT_ISOLATION: []
    };

    const assembliesBySubject: Record<string, InvestigationAssembly[]> = {};
    const assembliesByResource: Record<string, InvestigationAssembly[]> = {};

    for (const asm of assemblies) {
      assembliesByVector[asm.vector].push(asm);

      if (!assembliesBySubject[asm.subjectId]) {
        assembliesBySubject[asm.subjectId] = [];
      }
      assembliesBySubject[asm.subjectId].push(asm);

      if (!assembliesByResource[asm.resourceInstanceKey]) {
        assembliesByResource[asm.resourceInstanceKey] = [];
      }
      assembliesByResource[asm.resourceInstanceKey].push(asm);
    }

    // Sort grouped lists to preserve determinism
    for (const vec of Object.keys(assembliesByVector) as AuthorizationVector[]) {
      assembliesByVector[vec].sort((a, b) => a.assemblyId.localeCompare(b.assemblyId));
    }
    for (const sub of Object.keys(assembliesBySubject)) {
      assembliesBySubject[sub].sort((a, b) => a.assemblyId.localeCompare(b.assemblyId));
    }
    for (const res of Object.keys(assembliesByResource)) {
      assembliesByResource[res].sort((a, b) => a.assemblyId.localeCompare(b.assemblyId));
    }

    // Deep freeze results to satisfy immutability invariants
    return Object.freeze({
      assemblies: Object.freeze(assemblies),
      assembliesByVector: Object.freeze(assembliesByVector),
      assembliesBySubject: Object.freeze(assembliesBySubject),
      assembliesByResource: Object.freeze(assembliesByResource)
    });
  }


}
