import { InvestigationAssemblyInventory } from './investigation-assembly';
import { InvestigationCluster, InvestigationClusterInventory } from './investigation-cluster';
import { AuthorizationVector } from './authorization-vector';
import { sanitizeResourceFamily } from './resource-analysis-utils';

export class InvestigationClusterer {
  /**
   * Statelessly clusters InvestigationAssemblyInventory into a stable, deterministic,
   * and immutable InvestigationClusterInventory.
   */
  public clusterAssemblies(
    assemblyInventory: InvestigationAssemblyInventory
  ): InvestigationClusterInventory {
    const clusterMap = new Map<string, {
      dimensions: {
        vector: AuthorizationVector;
        targetResourceFamily: string;
        authorizationSurface: string;
      };
      assemblyIds: Set<string>;
    }>();

    // 1. Traverse and group assemblies into unique buckets
    for (const asm of assemblyInventory.assemblies) {
      const sanitizedFamily = sanitizeResourceFamily(asm.targetResourceFamily);
      const sanitizedSurface = this.sanitizeSurfaceName(asm.authorizationSurface);
      const clusterId = `clst_${asm.vector}_${sanitizedFamily}_${sanitizedSurface}`;

      let bucket = clusterMap.get(clusterId);
      if (!bucket) {
        bucket = {
          dimensions: {
            vector: asm.vector,
            targetResourceFamily: asm.targetResourceFamily,
            authorizationSurface: asm.authorizationSurface
          },
          assemblyIds: new Set<string>()
        };
        clusterMap.set(clusterId, bucket);
      }

      bucket.assemblyIds.add(asm.assemblyId);
    }

    // 2. Convert buckets to finalized clusters, ensuring sorting within each cluster
    const clusters: InvestigationCluster[] = [];

    for (const [clusterId, bucket] of clusterMap.entries()) {
      const sortedAssemblyIds = Array.from(bucket.assemblyIds).sort((a, b) => a.localeCompare(b));

      clusters.push(Object.freeze({
        clusterId,
        dimensions: Object.freeze({
          vector: bucket.dimensions.vector,
          targetResourceFamily: bucket.dimensions.targetResourceFamily,
          authorizationSurface: bucket.dimensions.authorizationSurface
        }),
        assemblyIds: Object.freeze(sortedAssemblyIds)
      }));
    }

    // 3. Sort global cluster list alphabetically by clusterId for absolute serialization stability
    clusters.sort((a, b) => a.clusterId.localeCompare(b.clusterId));

    // 4. Group by secondary indices and freeze lists
    const clustersByVector: Record<AuthorizationVector, InvestigationCluster[]> = {
      IDOR: [],
      BAC: [],
      TENANT_ISOLATION: []
    };
    const clustersByResourceFamily: Record<string, InvestigationCluster[]> = {};

    for (const cluster of clusters) {
      clustersByVector[cluster.dimensions.vector].push(cluster);

      const family = cluster.dimensions.targetResourceFamily;
      if (!clustersByResourceFamily[family]) {
        clustersByResourceFamily[family] = [];
      }
      clustersByResourceFamily[family].push(cluster);
    }

    // Freeze individual vector index lists
    for (const vec of Object.keys(clustersByVector) as AuthorizationVector[]) {
      Object.freeze(clustersByVector[vec]);
    }

    // Freeze individual resource family index lists
    for (const fam of Object.keys(clustersByResourceFamily)) {
      Object.freeze(clustersByResourceFamily[fam]);
    }

    return Object.freeze({
      clusters: Object.freeze(clusters),
      clustersByVector: Object.freeze(clustersByVector),
      clustersByResourceFamily: Object.freeze(clustersByResourceFamily)
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
