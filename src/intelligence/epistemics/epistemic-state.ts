/**
 * @canonical
 * Epistemic State Contracts
 * Defines the rigorous epistemic states of cognition nodes, mandating replay lineage for deterministic proof.
 */

export type EpistemicState =
  | 'UNOBSERVED'
  | 'SUSPECTED'
  | 'CONTRADICTED'
  | 'DETERMINISTICALLY_PROVEN'
  | 'DETERMINISTICALLY_FALSIFIED'
  | 'EPISTEMIC_DEAD_END';

export interface EpistemicValidity {
  currentState: EpistemicState;
  confidenceScore: number;
  deterministicLineageRefs: string[]; // Required for PROVEN / FALSIFIED
}

export interface EpistemicTransition {
  transitionId: string;
  nodeId: string;
  fromState: EpistemicState;
  toState: EpistemicState;
  triggeringInfluenceEdgeId?: string;
  transitionedAtTs: number;
}

export interface EpistemicResolution {
  resolutionId: string;
  nodeId: string;
  finalState: 'DETERMINISTICALLY_PROVEN' | 'DETERMINISTICALLY_FALSIFIED';
  resolvingReplaySessionId: string; // The canonical proof
  resolvedAtTs: number;
}

export interface EpistemicDeadEnd {
  nodeId: string;
  declaredAtTs: number;
  reason: 'REQUIRES_DESTRUCTIVE_MUTATION' | 'UNMOCKED_THIRD_PARTY_BOUNDARY' | 'EXCESSIVE_COMBINATORIAL_DEPTH';
}

export interface EpistemicStability {
  timeInCurrentStateMs: number;
  transitionCount: number;
  isStable: boolean;
}

export interface EpistemicDrift {
  nodeId: string;
  driftDetectedAtTs: number;
  expectedState: EpistemicState;
  observedState: EpistemicState;
  driftingSessionId: string;
}
