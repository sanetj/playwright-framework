import { WorkflowAnalysisResult } from './workflow-analysis-result';
import { WorkflowEvaluationResult } from './workflow-evaluator';

export interface WorkflowAnalysisSummary {
  totalPaths: number;
  totalEntities: number;
  totalBoundaries: number;
  totalRiskSignals: number;
  suspicious: boolean;
}

/**
 * WorkflowAnalysisSummarizer
 * Compiles a direct, deterministic summary of workflow metrics and evaluation flags.
 */
export class WorkflowAnalysisSummarizer {
  /**
   * Translates analysis outcomes and evaluation flags into a metric summary package.
   *
   * @param analysis Aggregated workflow analysis results
   * @param evaluation Suspicion metrics evaluated
   * @returns Pure deterministic summary metrics
   */
  public summarize(
    analysis: WorkflowAnalysisResult,
    evaluation: WorkflowEvaluationResult
  ): WorkflowAnalysisSummary {
    return {
      totalPaths: analysis.paths.length,
      totalEntities: analysis.entities.length,
      totalBoundaries: analysis.boundaries.length,
      totalRiskSignals: analysis.riskSignals.length,
      suspicious: evaluation.suspicious
    };
  }
}
