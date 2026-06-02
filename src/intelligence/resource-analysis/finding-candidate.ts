import { AuthorizationVector } from './authorization-vector';

export interface FindingCandidate {
  /**
   * Deterministic unique ID format: "fc_${vector}_${sanitizedResourceFamily}_${sanitizedSurface}"
   * e.g., "fc_IDOR_rest_basket_basketId_basket_surface"
   */
  readonly candidateId: string;

  /**
   * Finding Key Dimensions (mapped directly from the cluster's dimensions)
   */
  readonly vector: AuthorizationVector;
  readonly targetResourceFamily: string;
  readonly authorizationSurface: string;

  /**
   * Downstream references to the constituent cluster.
   * Under a strict 1:1 mapping, this array contains exactly one element.
   */
  readonly clusterIds: readonly string[];

  /**
   * Aggregated assembly IDs resolved from the constituent cluster.
   * Sorted alphabetically.
   */
  readonly assemblyIds: readonly string[];
}

export interface FindingCandidateInventory {
  /**
   * Flat list of finding candidates, sorted alphabetically by candidateId.
   */
  readonly candidates: readonly FindingCandidate[];

  /**
   * Grouped index by AuthorizationVector.
   */
  readonly candidatesByVector: Readonly<Record<AuthorizationVector, readonly FindingCandidate[]>>;
}
