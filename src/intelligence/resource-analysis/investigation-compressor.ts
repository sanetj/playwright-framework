import { InvestigationClusterInventory } from './investigation-cluster';
import { FindingCandidate, FindingCandidateInventory } from './finding-candidate';
import { AuthorizationVector } from './authorization-vector';
import { sanitizeResourceFamily } from './resource-analysis-utils';

export class InvestigationCompressor {
  /**
   * Statelessly maps InvestigationClusterInventory 1:1 into FindingCandidateInventory,
   * preserving grouping safety.
   */
  public compressClusters(
    clusterInventory: InvestigationClusterInventory
  ): FindingCandidateInventory {
    const candidates: FindingCandidate[] = [];

    // 1. Map each cluster 1:1 to a FindingCandidate
    for (const cluster of clusterInventory.clusters) {
      const sanitizedFamily = sanitizeResourceFamily(cluster.dimensions.targetResourceFamily);
      const sanitizedSurface = this.sanitizeSurfaceName(cluster.dimensions.authorizationSurface);
      const candidateId = `fc_${cluster.dimensions.vector}_${sanitizedFamily}_${sanitizedSurface}`;

      candidates.push(Object.freeze({
        candidateId,
        vector: cluster.dimensions.vector,
        targetResourceFamily: cluster.dimensions.targetResourceFamily,
        authorizationSurface: cluster.dimensions.authorizationSurface,
        clusterIds: Object.freeze([cluster.clusterId]),
        assemblyIds: Object.freeze([...cluster.assemblyIds].sort((a, b) => a.localeCompare(b)))
      }));
    }

    // 2. Sort global candidates array alphabetically by candidateId
    candidates.sort((a, b) => a.candidateId.localeCompare(b.candidateId));

    // 3. Group by secondary vector index
    const candidatesByVector: Record<AuthorizationVector, FindingCandidate[]> = {
      IDOR: [],
      BAC: [],
      TENANT_ISOLATION: []
    };

    for (const cand of candidates) {
      candidatesByVector[cand.vector].push(cand);
    }

    // Freeze secondary index lists
    for (const vec of Object.keys(candidatesByVector) as AuthorizationVector[]) {
      Object.freeze(candidatesByVector[vec]);
    }

    return Object.freeze({
      candidates: Object.freeze(candidates),
      candidatesByVector: Object.freeze(candidatesByVector)
    });
  }

  private sanitizeSurfaceName(surface: string): string {
    return surface
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
