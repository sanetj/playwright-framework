/**
 * @architecture_authority Evidence Sufficiency Contracts
 * @responsibility Defines the deterministic, read-only representation of structural completeness within an Investigation.
 * @invariants
 * - Sufficiency never evaluates severity or correctness.
 * - Sufficiency only references existing structural arrays to determine if the investigation is structurally complete.
 */

export type SufficiencyStatus = 'SUFFICIENT' | 'PARTIALLY_SUPPORTED' | 'INSUFFICIENT';

export type SufficiencyCategory = 
  | 'EVIDENCE_COVERAGE'
  | 'CONSISTENCY_COVERAGE'
  | 'GRAPH_COMPLETENESS'
  | 'OWNERSHIP_COMPLETENESS';

export interface SufficiencyObservation {
  readonly observationIdentity: string;
  readonly category: SufficiencyCategory;
  readonly status: SufficiencyStatus;
  readonly supportingReferences: readonly string[]; // IDs of candidates, graphs, or reports
  readonly rationale: string;
}

export interface EvidenceSufficiencyReport {
  readonly reportIdentity: string;
  readonly investigationId: string;
  readonly overallStatus: SufficiencyStatus;
  readonly observations: readonly SufficiencyObservation[];
}
