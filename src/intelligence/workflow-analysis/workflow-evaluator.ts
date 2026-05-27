import { WorkflowAnalysisResult } from './workflow-analysis-result';

export interface WorkflowEvaluationResult {
  suspicious: boolean;
  triggeredSignals: string[];
}

/**
 * WorkflowEvaluator
 * Evaluates aggregated analysis results deterministically to detect suspicious patterns.
 */
export class WorkflowEvaluator {
  /**
   * Performs a deterministic evaluation of risk signals within a workflow analysis result.
   *
   * @param analysis Completed workflow analysis result package
   * @returns Deterministic evaluation metrics
   */
  public evaluate(
    analysis: WorkflowAnalysisResult
  ): WorkflowEvaluationResult {
    const suspicious = analysis.riskSignals.length > 0;
    
    // Extract signal types deterministically, filtering out undefined values
    const triggeredSignals = analysis.riskSignals
      .map(signal => signal.signalType)
      .filter((type): type is string => typeof type === 'string');

    return {
      suspicious,
      triggeredSignals
    };
  }
}
