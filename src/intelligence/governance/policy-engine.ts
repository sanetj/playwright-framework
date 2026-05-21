import { IntentCategory, PolicyDecision, RiskCategory } from '../ontology/cognition-primitives';
import { NormalizedEvent } from '../events/normalized-event';

/**
 * @canonical
 * Foundations for Policy Evaluation and Intent Classification
 */

export interface DryRunEvaluation {
  decision: PolicyDecision;
  simulatedStateChanges: string[];
  warnings: string[];
}

export interface IntentClassifier {
  classify(eventContext: NormalizedEvent): IntentCategory;
  confidenceScore(): number;
}

export interface PolicyEngine {
  /**
   * Evaluates if a given intent and event context is permitted under current governance.
   */
  evaluate(intent: IntentCategory, event: NormalizedEvent): PolicyDecision;
  
  /**
   * Performs a dry-run evaluation without executing or enforcing the policy.
   */
  dryRun(intent: IntentCategory, event: NormalizedEvent): DryRunEvaluation;
}
