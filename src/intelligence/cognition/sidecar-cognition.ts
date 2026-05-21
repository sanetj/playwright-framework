/**
 * @canonical
 * Sidecar Cognition Contracts
 * Separates probabilistic AI interpretations from the deterministic runtime graph.
 */

export interface InferenceConfidence {
  score: number;
  engineId: string;
  evidenceEventIds: string[];
}

export interface ProbabilisticInference {
  id: string;
  inferredAtTs: number;
  hypothesis: SemanticHypothesis;
  confidence: InferenceConfidence;
}

export interface SemanticHypothesis {
  targetNodeId?: string;
  targetEdgeId?: string;
  description: string;
  proposedRiskCategory?: string;
  suggestedActionType?: string;
}

export interface SidecarAnnotation {
  annotationId: string;
  targetCanonicalId: string; // The ID of the deterministic event or graph node this annotates
  inference: ProbabilisticInference;
}

export interface CognitionSidecar {
  engineId: string;
  version: string;
  annotateEvent(eventId: string, hypothesis: SemanticHypothesis, confidenceScore: number): SidecarAnnotation;
  annotateNode(nodeId: string, hypothesis: SemanticHypothesis, confidenceScore: number): SidecarAnnotation;
}
