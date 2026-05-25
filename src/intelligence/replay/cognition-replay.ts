/**
 * @canonical
 * Cognition Replay Hooks
 * Preserves the ability to replay deterministic telemetry while dynamically regenerating AI evaluations.
 */

export interface ReplayOntologyVersion {
  versionStr: string;
  hash: string;
}

export interface ReplaySemanticProjection {
  projectionId: string;
  sourceReplaySessionId: string;
  ontologyVersion: ReplayOntologyVersion;
  generatedAtTs: number;
}

export interface CognitionReplaySession {
  replaySessionId: string;
  originalSessionId: string;
  telemetryEventCount: number;
  projections: ReplaySemanticProjection[];
}

export interface ReplayRegenerationContract {
  /**
   * Accepts a stream of deterministic raw events from a past session,
   * and regenerates the semantic graph using the current KernelAnalyzer pipeline.
   */
  regenerateCognition(originalSessionId: string, currentOntology: ReplayOntologyVersion): ReplaySemanticProjection;
}
