/**
 * @canonical
 * Uncertainty Propagation Contracts
 * Defines how confidence cascades and degrades across derived inferences to prevent hallucinated certainty.
 */

export interface ConfidenceScore {
  baseValue: number; // 0.0 to 1.0
  calculatedAtTs: number;
}

export interface EvidenceStrength {
  evidenceId: string;
  strengthFactor: number; // 0.0 to 1.0
  isDeterministic: boolean; // True if backed by a replayable NormalizedEvent
}

export interface AuthorityWeight {
  authorityId: string;
  authorityType: 'AI_MODEL' | 'HEURISTIC' | 'DETERMINISTIC_REPLAY' | 'HUMAN';
  weight: number;
}

export interface ConfidenceExposure {
  exposedToContradictionIds: string[];
  maxContradictionSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NONE';
  penaltyFactor: number;
}

export interface ConfidenceDecay {
  decayModel: 'LINEAR' | 'EXPONENTIAL' | 'STEP';
  halfLifeMs: number;
  lastDecayAppliedAtTs: number;
}

export interface UncertaintyPropagation {
  sourceConfidenceScores: number[];
  propagationMethod: 'BAYESIAN' | 'MINIMUM' | 'MULTIPLICATIVE';
  resultantConfidence: number;
}

export interface ProbabilisticAssertion {
  assertionId: string;
  assertionType: string;
  content: string;
  confidence: ConfidenceScore;
  evidenceStrength: EvidenceStrength[];
  authority: AuthorityWeight;
  exposure: ConfidenceExposure;
  decay?: ConfidenceDecay;
  propagationLineage?: UncertaintyPropagation;
}
