/**
 * @architecture_authority Investigation Attack Graph
 * @responsibility Deterministically represents the potential investigative paths linking Prioritized Candidates.
 * @invariants
 * - Graph nodes must strictly represent a valid Candidate ID.
 * - Graph edges must strictly represent a structurally verified relationship.
 * - Graph generation does not produce new hypotheses.
 */

export type TransitionSemantics = 
  | 'SHARED_RESOURCE'
  | 'SHARED_OWNERSHIP_BOUNDARY'
  | 'SHARED_ACTOR_CONTEXT';

export interface AttackGraphNode {
  readonly candidateId: string;
  readonly priorityRank: number;
}

export interface AttackGraphEdge {
  readonly sourceCandidateId: string;
  readonly targetCandidateId: string;
  readonly semanticType: TransitionSemantics;
}

export interface InvestigationAttackGraph {
  readonly graphIdentity: string;
  readonly nodes: readonly AttackGraphNode[];
  readonly edges: readonly AttackGraphEdge[];
}
