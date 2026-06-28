/**
 * @architecture_authority Structural Novelty Contracts
 * @responsibility Defines the deterministic, read-only representation of structural uniqueness within an Attack Graph.
 * @invariants
 * - Novelty never manufactures evidence or predictions.
 * - Novelty only references existing graph topology and consistency reports.
 */

export type NoveltyCategory = 
  | 'TOPOLOGY_NOVELTY'
  | 'AUTHORIZATION_NOVELTY'
  | 'CORRELATION_NOVELTY';

export interface NoveltyObservation {
  readonly noveltyIdentity: string;
  readonly category: NoveltyCategory;
  readonly participatingCandidateIds: readonly string[];
  readonly participatingGraphIds: readonly string[];
  readonly supportingConsistencyReferences: readonly string[]; // IDs of consistency reports
  readonly structuralDescription: string;
}

export interface StructuralNoveltyReport {
  readonly reportIdentity: string;
  readonly graphIdentity: string;
  readonly observations: readonly NoveltyObservation[];
  readonly totalCategoriesObserved: number;
}
