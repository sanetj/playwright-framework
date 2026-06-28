/**
 * @architecture_authority Consistency Analysis Contracts
 * @responsibility Defines the deterministic, read-only representation of structural logic conflicts inside Attack Graphs.
 * @invariants
 * - Contradictions never modify or invalidate the Graph.
 * - Contradictions only point to logical structural conflicts that warrant investigator attention.
 */

export type ContradictionCategory = 
  | 'ACTOR_CONSISTENCY'
  | 'INVESTIGATION_PROGRESSION'
  | 'AUTHORIZATION_CONSISTENCY';

export interface StructuralContradiction {
  readonly contradictionIdentity: string;
  readonly category: ContradictionCategory;
  readonly participatingCandidateIds: readonly string[];
  readonly participatingEdgeIds: readonly string[];
  readonly severity: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly description: string;
}

export interface ConsistencyReport {
  readonly graphIdentity: string;
  readonly totalChecksPerformed: number;
  readonly contradictions: readonly StructuralContradiction[];
  readonly isStructurallyConsistent: boolean; // True if contradictions.length === 0
}
