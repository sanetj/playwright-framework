/**
 * @architecture_authority Investigation Candidate Representation
 * @responsibility Deterministically represents a grouped collection of validated signals that likely describe a single investigation.
 * @invariants
 * - Candidates never own truth; they only reference Replay and Evidence.
 * - Candidate identity is mathematically deterministic based on inputs.
 * - Candidates are assembled, not scored or prioritized.
 */

export type CandidateLifecycleStage = 'SYNTHESIZED' | 'CORRELATED' | 'VALIDATED_INPUTS_CONFIRMED' | 'READY_FOR_SCORING';

export interface InvestigationCandidate {
  readonly candidateIdentity: string;
  readonly lifecycle: CandidateLifecycleStage;
  
  // Core Architectural References
  readonly validatedFindingIds: readonly string[];
  readonly evidenceExchangeIds: readonly string[];
  
  // Expanded Context References (Phase 12.16A)
  readonly baseRoleContext: string;
  readonly comparisonRoleContext: string;
  readonly ownershipReferences: readonly string[]; // IDs to Ownership Inventory items
  
  // Grouping Dimensions
  readonly targetEntityId: string; // The endpoint or semantic resource the candidate targets
  readonly candidateType: string;
  
  // Optional intelligence dimensions (e.g. Workflow mapping references)
  readonly supportingSignals: readonly string[];
}
