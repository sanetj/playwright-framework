import { AuthorizationVector } from './authorization-vector';

export interface ClusteringDimensions {
  readonly vector: AuthorizationVector;
  readonly targetResourceFamily: string;
  readonly authorizationSurface: string;
}

export interface InvestigationCluster {
  readonly clusterId: string;
  readonly dimensions: ClusteringDimensions;
  readonly assemblyIds: readonly string[];
}

export interface InvestigationClusterInventory {
  readonly clusters: readonly InvestigationCluster[];
  readonly clustersByVector: Readonly<Record<AuthorizationVector, readonly InvestigationCluster[]>>;
  readonly clustersByResourceFamily: Readonly<Record<string, readonly InvestigationCluster[]>>;
}
