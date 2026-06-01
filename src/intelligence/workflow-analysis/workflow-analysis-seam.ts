import { ActionGraph } from '../../graph/action-graph';
import { WorkflowDiscoveryEngine } from '../workflow-discovery/discovery-engine';
import { WorkflowEvaluator } from './workflow-evaluator';
import { WorkflowAnalysisSummarizer } from './workflow-analysis-summary';
import { WorkflowPathExtractor } from './workflow-path-extractor';
import { WorkflowEvidenceBuilder } from './workflow-evidence';
import { WorkflowAnalysisBuilder } from './workflow-analysis-result';
import { WorkflowAnalysisPipeline, WorkflowPipelineResult } from './workflow-analysis-pipeline';

/**
 * runDeterministicAnalysis
 *
 * The canonical, explicit analysis seam between replay and cognition.
 *
 * This function is the ONLY sanctioned entry point for executing the
 * deterministic workflow analysis pipeline against a captured ActionGraph.
 *
 * @doctrine SYNCHRONOUS — No async, no Promises, no callbacks.
 * @doctrine STATELESS — No caching, no memoization, no cross-invocation state.
 * @doctrine DETERMINISTIC — Identical ActionGraph input produces identical output, always.
 * @doctrine SIDE-EFFECT-FREE — No runtime mutation, no browser actions, no persistence.
 * @doctrine EPHEMERAL — Pipeline is constructed, executed, and discarded in a single call.
 *
 * @param graph The raw ActionGraph captured from replay. Read-only consumption.
 * @returns Immutable WorkflowPipelineResult value object.
 */
export function runDeterministicAnalysis(graph: ActionGraph): WorkflowPipelineResult {
  const pipeline = new WorkflowAnalysisPipeline(
    new WorkflowDiscoveryEngine(),
    new WorkflowEvaluator(),
    new WorkflowAnalysisSummarizer(),
    new WorkflowPathExtractor(),
    new WorkflowEvidenceBuilder(),
    new WorkflowAnalysisBuilder()
  );

  // 1. Pure Deterministic Analysis Execution (Read-only ActionGraph consumption)
  const result = pipeline.run(graph);

  // 2. Deterministic Execution Assertion (Ensure zero async/Promise creep)
  if (result instanceof Promise || (result && typeof (result as any).then === 'function')) {
    throw new Error(`Doctrine Violation: Deterministic analysis must be synchronous and cannot return a Promise.`);
  }

  // 3. Terminal Immutable Handoff
  return deepFreeze(result);
}

/**
 * deepFreeze
 *
 * Recursively freezes an object hierarchy to guarantee runtime immutability.
 * Uses a WeakSet to handle shared references or potential cyclic graphs safely.
 */
function deepFreeze<T>(obj: T, visited = new WeakSet<any>()): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object' && typeof obj !== 'function') {
    return obj;
  }

  if (visited.has(obj)) {
    return obj;
  }

  visited.add(obj);

  // Freeze all own properties recursively
  for (const key of Object.getOwnPropertyNames(obj)) {
    const prop = (obj as any)[key];
    if (prop !== null && typeof prop === 'object') {
      deepFreeze(prop, visited);
    }
  }

  // Freeze the object itself
  return Object.freeze(obj);
}

