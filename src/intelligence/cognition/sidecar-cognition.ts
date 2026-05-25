/**
 * @canonical
 * Sidecar Cognition Contracts
 * Separates probabilistic AI interpretations from the deterministic runtime graph.
 */

export interface DeterministicEvaluationConfidence {
  score: number;
  engineId: string;
  evidenceEventIds: string[];
}

export interface ProbabilisticDeterministicEvaluation {
  id: string;
  inferredAtTs: number;
  candidate: SemanticInvestigationCandidate;
  confidence: DeterministicEvaluationConfidence;
}

export interface SemanticInvestigationCandidate {
  targetNodeId?: string;
  targetEdgeId?: string;
  description: string;
  proposedRiskCategory?: string;
  suggestedActionType?: string;
}

export interface SidecarAnnotation {
  annotationId: string;
  targetCanonicalId: string; // The ID of the deterministic event or graph node this annotates
  evaluation: ProbabilisticDeterministicEvaluation;
}

export interface CognitionSidecar {
  engineId: string;
  version: string;
  annotateEvent(eventId: string, candidate: SemanticInvestigationCandidate, confidenceScore: number): SidecarAnnotation;
  annotateNode(nodeId: string, candidate: SemanticInvestigationCandidate, confidenceScore: number): SidecarAnnotation;
}
