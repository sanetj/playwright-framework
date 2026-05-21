/**
 * @canonical
 * False Positive Control Contracts
 * Reduces false positives caused by session drift, timing differences, or transient UI states.
 */

export interface DifferentialNoiseSignal {
  signalId: string;
  sourceEventId: string;
  noiseType: 'TIMESTAMP_DRIFT' | 'DYNAMIC_TOKEN_MISMATCH' | 'ANIMATION_DELAY' | 'NON_DETERMINISTIC_UI_STATE';
}

export interface ReplayVarianceGuard {
  guardId: string;
  allowedVarianceThresholdMs: number;
  ignoreDynamicSelectors: string[];
}

export interface EvidenceConsistencyCheck {
  checkId: string;
  evidenceId: string;
  isConsistentAcrossReplays: boolean;
  consistencyScore: number;
}

export interface ContradictionReliability {
  reliabilityId: string;
  contradictionId: string;
  isConfirmedBySecondReplay: boolean;
  noiseSignalsDetected: DifferentialNoiseSignal[];
}

export interface ConfidenceStabilizer {
  stabilizerId: string;
  applyVarianceGuards(guards: ReplayVarianceGuard[]): void;
  assessReliability(contradictionId: string): ContradictionReliability;
}
