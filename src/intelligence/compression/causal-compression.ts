/**
 * @canonical
 * Causal Compression Contracts
 * Ensures semantic compression optimizes for signal over chronology, strictly preserving exploit reproducibility.
 */

export interface ExplainabilityAnchor {
  anchorEventId: string;
  significance: 'AUTH_TRANSITION' | 'ENTITY_ACCESS' | 'RUNTIME_EXCEPTION' | 'POLICY_VIOLATION';
}

export interface CausalSlice {
  sliceId: string;
  orderedEventIds: string[];
}

export interface CausalChain {
  chainId: string;
  anchors: ExplainabilityAnchor[];
  slices: CausalSlice[];
}

export interface SemanticCompressionArtifact {
  artifactId: string;
  generatedAtTs: number;
  originalEventCount: number;
  compressedEventCount: number;
  preservedCausalChain: CausalChain;
  semanticSummary: string;
}

export interface CompressionBoundary {
  /**
   * Defines a boundary where chronology can be safely collapsed without losing causal integrity.
   */
  startEventId: string;
  endEventId: string;
  isSafeToCollapse: boolean;
}
