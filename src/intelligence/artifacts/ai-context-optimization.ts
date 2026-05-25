/**
 * @canonical
 * AI Context Optimization Contracts
 * Compresses telemetry into high-signal AI-readable context, maximizing evaluation quality.
 */

export interface NoiseReductionFilter {
  filterId: string;
  excludeEventTypes: string[];
  excludeHeaders: string[];
  excludeSelectors: string[]; // e.g., tracking pixels
}

export interface ContextCompressionRule {
  ruleId: string;
  collapseRepeatedWorkflows: boolean;
  preserveContradictionEvidence: boolean;
  maximumPayloadDepth: number;
}

export interface OptimizedAiContext {
  contextId: string;
  sourceBundleId: string;
  optimizedPayload: string; // The heavily compressed JSON or Markdown string meant for the LLM context window
  compressionRatio: number;
  retainedCriticalEventIds: string[];
}
