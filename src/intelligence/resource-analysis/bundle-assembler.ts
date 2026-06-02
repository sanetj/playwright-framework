import { FindingCandidateInventory } from './finding-candidate';
import { FindingNarrativeInventory } from './finding-narrative';
import { EvidenceMapInventory } from './finding-evidence-map';
import { InvestigationBundle, BundleInventory } from './investigation-bundle';
import { AuthorizationVector } from './authorization-vector';

export class BundleAssembler {
  /**
   * Statelessly constructs BundleInventory by aggregating FindingCandidateInventory,
   * FindingNarrativeInventory, and EvidenceMapInventory.
   */
  public assemble(
    candidateInventory: FindingCandidateInventory,
    narrativeInventory: FindingNarrativeInventory,
    evidenceMapInventory: EvidenceMapInventory
  ): BundleInventory {
    const bundles: InvestigationBundle[] = [];

    // Create fast lookup maps for verification to prevent orphan bundles
    const candidates = new Set(candidateInventory.candidates.map(c => c.candidateId));
    const narratives = new Set(narrativeInventory.narratives.map(n => n.narrativeId));

    const processedCandidates = new Set<string>();

    for (const map of evidenceMapInventory.maps) {
      if (processedCandidates.has(map.candidateId)) {
        continue;
      }
      
      // Enforce lookup verification of candidate and narrative
      if (!candidates.has(map.candidateId) || !narratives.has(map.narrativeId)) {
        continue;
      }

      processedCandidates.add(map.candidateId);
      const bundleId = `bundle_${map.candidateId}`;

      bundles.push(Object.freeze({
        bundleId,
        candidateId: map.candidateId,
        narrativeId: map.narrativeId,
        evidenceMapId: map.evidenceMapId,
        assemblyId: map.evidence.assemblyId,
        vector: map.vector,
        targetResourceFamily: map.targetResourceFamily,
        authorizationSurface: map.authorizationSurface
      }));
    }

    // Sort bundles alphabetically by bundleId to guarantee determinism
    bundles.sort((a, b) => a.bundleId.localeCompare(b.bundleId));

    // Group by vector index
    const bundlesByVector: Record<AuthorizationVector, InvestigationBundle[]> = {
      IDOR: [],
      BAC: [],
      TENANT_ISOLATION: []
    };

    for (const bundle of bundles) {
      bundlesByVector[bundle.vector].push(bundle);
    }

    // Freeze secondary index lists
    for (const vec of Object.keys(bundlesByVector) as AuthorizationVector[]) {
      Object.freeze(bundlesByVector[vec]);
    }

    return Object.freeze({
      bundles: Object.freeze(bundles),
      bundlesByVector: Object.freeze(bundlesByVector)
    });
  }
}
