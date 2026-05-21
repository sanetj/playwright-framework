/**
 * @canonical
 * Investigation Dynamics Contracts
 * Defines how investigations evolve dynamically through epistemic pressure rather than autonomous roaming.
 */

export interface DeterministicEvidenceGap {
  gapId: string;
  missingEventType: string;
  requiredStateContext: string;
}

export interface MissingCausalLink {
  linkId: string;
  fromNodeId: string;
  toNodeId: string;
  evidenceGaps: DeterministicEvidenceGap[];
}

export interface InvestigativePressure {
  pressureScore: number;
  drivingHypothesisId: string;
  missingLinks: MissingCausalLink[];
  calculatedAtTs: number;
}

export interface HypothesisCorroboration {
  corroborationId: string;
  hypothesisId: string;
  corroboratingEventId: string;
  confidenceDelta: number;
}

export interface HypothesisEscalation {
  escalationId: string;
  hypothesisId: string;
  escalationTrigger: 'PRESSURE_THRESHOLD_MET' | 'CRITICAL_CONTRADICTION' | 'HUMAN_OVERRIDE';
  escalatedAtTs: number;
}

export interface InvestigationDeadlock {
  deadlockId: string;
  investigationId: string;
  reason: 'EPISTEMIC_DEAD_END_REACHED' | 'BUDGET_EXHAUSTED' | 'CIRCULAR_DEPENDENCY';
  declaredAtTs: number;
}

export interface InvestigationLifecycle {
  investigationId: string;
  targetHypothesisId: string;
  startedAtTs: number;
  status: 'ACTIVE' | 'DEADLOCKED' | 'RESOLVED_PROVEN' | 'RESOLVED_FALSIFIED';
  accumulatedPressure: InvestigativePressure[];
  deadlockState?: InvestigationDeadlock;
}
