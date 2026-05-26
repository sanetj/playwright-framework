/**
 * @canonical
 * Semantic Compression Evolution Contracts
 * Preserves investigative meaning and causal chains while heavily reducing telemetry entropy.
 */

import { ExplainabilityAnchor } from '../compression/causal-compression';

export interface CompressionInvariant {
  invariantId: string;
  description: string;
  mustPreserveEventIds: string[];
}

export interface LineageFold {
  foldId: string;
  collapsedEventIds: string[];
  retainedEntityId: string;
  foldReason: string;
}

export interface GraphCondensation {
  condensationId: string;
  originalNodeCount: number;
  compressedNodeCount: number;
  retainedCriticalEdges: string[];
}

export interface CausalSummary {
  summaryId: string;
  narrativeText: string;
  criticalAnchors: ExplainabilityAnchor[];
  invariants: CompressionInvariant[];
}

export interface SemanticSnapshot {
  snapshotId: string;
  generatedAtTs: number;
  sourceSessionId: string;
  causalSummary: CausalSummary;
  graphCondensation: GraphCondensation;
  lineageFolds: LineageFold[];
}
