/**
 * @canonical
 * Temporal Reasoning Engine Contracts
 * Facilitates causal temporal cognition to answer "WHY did the runtime become this?".
 */

export interface TemporalWindow {
  validFrom: number;
  validTo?: number;
}

export interface TemporalObservation {
  id: string;
  observedAt: number;
  derivedAt: number;
  validity: TemporalWindow;
  sourceEventId: string;
}

export interface TemporalState {
  stateId: string;
  baseStateSnapshot: Record<string, unknown>;
  observation: TemporalObservation;
}

export interface TemporalDelta {
  fromStateId: string;
  toStateId: string;
  mutatedFields: string[];
  causalEventId: string;
}

export interface CausalTransition {
  transitionId: string;
  delta: TemporalDelta;
  transitionReason: string;
  observedAt: number;
  derivedAt: number;
  validity: TemporalWindow;
}

export interface StateEvolution {
  entityId: string;
  evolutionPath: CausalTransition[];
}

export interface TimelineBranch {
  branchId: string;
  originEventId: string;
  branchReason: string;
  divergedAtTs: number;
  derivedAt: number;
  validity: TemporalWindow;
}

export interface ReplayTimeline {
  timelineId: string;
  rootSessionId: string;
  branches: TimelineBranch[];
  causalTransitions: CausalTransition[];
}
