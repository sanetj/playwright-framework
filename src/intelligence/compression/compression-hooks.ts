import { NormalizedEvent } from '../events/normalized-event';
import { CognitionSession } from '../ontology/cognition-primitives';

/**
 * @canonical
 * Lightweight contracts for semantic graph and event history compression.
 */

export interface EventDecayStrategy {
  /**
   * Determines if an event should be decayed (removed from active memory) based on age and tier.
   */
  shouldDecay(event: NormalizedEvent, currentTs: number): boolean;
}

export interface WorkflowCollapser {
  /**
   * Collapses a series of low-tier events into a single semantic workflow observation.
   */
  collapse(events: NormalizedEvent[]): NormalizedEvent[];
}

export interface GraphPruner {
  /**
   * Identifies orphaned or irrelevant graph nodes for pruning.
   */
  pruneIrrelevantNodes(session: CognitionSession): void;
}

export interface SemanticSummarizer {
  /**
   * Generates a high-level semantic summary of a given set of events.
   */
  summarize(events: NormalizedEvent[]): string;
}
