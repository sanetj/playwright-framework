/**
 * @canonical
 * Cognitive Propagation Contracts
 * Defines strict boundaries and limits on how confidence and epistemic states propagate across the graph.
 */

export interface EpistemicCascadeLimit {
  maxDepth: number;
  maxBreadthPerNode: number;
  maxTotalNodesAffected: number;
}

export interface PropagationBoundary {
  boundaryId: string;
  preventPropagationBeyondDomain: boolean;
  preventPropagationBeyondSession: boolean;
  preventPropagationBeyondTenant: boolean;
}

export interface PropagationPolicy {
  policyId: string;
  limits: EpistemicCascadeLimit;
  boundaries: PropagationBoundary;
  allowCyclicInfluence: false; // Circular reasoning is strictly forbidden
}

export interface ConfidenceDecayCascade {
  cascadeId: string;
  originNodeId: string;
  affectedNodeIds: string[];
  totalConfidenceLost: number;
  haltedByBoundaryLimit?: boolean;
}

export interface CrossDomainInfluence {
  influenceId: string;
  sourceDomain: string;
  targetDomain: string;
  influenceWeightModifier: number; // Modifies the weight when crossing boundaries
}

export interface PropagationTermination {
  terminationId: string;
  cascadeId: string;
  reason: 'LIMIT_REACHED' | 'BOUNDARY_HIT' | 'CONFIDENCE_DEPLETED' | 'CIRCULAR_DEPENDENCY_DETECTED';
  terminatedAtTs: number;
}
