/**
 * @canonical
 * Epistemic Influence Contracts
 * Defines how cognitive artifacts influence each other. Evidence lineage is mandatory.
 */

export type InfluencePolarity = 'SUPPORTS' | 'REFUTES' | 'COMPLICATES';

export interface InfluenceWeight {
  strength: number; // 0.0 to 1.0
  isDeterministic: boolean;
}

export interface EpistemicInfluenceEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  polarity: InfluencePolarity;
  weight: InfluenceWeight;
  evidenceLineageRefs: string[]; // Mandatory links to deterministic raw telemetry
  establishedAtTs: number;
}

export interface DivergenceMarker {
  markerId: string;
  aiSignalContextId: string;
  deterministicReplayEventId: string;
  divergenceDescription: string;
  detectedAtTs: number;
}

export interface ConfidenceInvalidationEvent {
  eventId: string;
  invalidatedNodeId: string;
  triggeringDivergenceId?: string;
  triggeringContradictionId?: string;
  cascadedFromEventId?: string;
}

export interface InfluencePropagationResult {
  propagationId: string;
  affectedNodeIds: string[];
  invalidationEventsGenerated: ConfidenceInvalidationEvent[];
  resolvedAtTs: number;
}

export interface InfluenceCascade {
  cascadeId: string;
  triggerEventId: string;
  propagationPath: string[];
  maxDepthReached: number;
  result: InfluencePropagationResult;
}
