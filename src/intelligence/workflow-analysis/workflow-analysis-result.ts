import { WorkflowPath } from './workflow-path-extractor';
import { WorkflowEvidence } from './workflow-evidence';
import { WorkflowEntity, WorkflowBoundary } from '../workflow-models/workflow-entities';
import { WorkflowRiskSignals as WorkflowRiskSignal } from '../workflow-models/workflow-risk-signals';

export interface WorkflowAnalysisResult {
  paths: WorkflowPath[];
  entities: WorkflowEntity[];
  boundaries: WorkflowBoundary[];
  riskSignals: WorkflowRiskSignal[];
  evidence: WorkflowEvidence[];
}

/**
 * WorkflowAnalysisBuilder
 * Aggregates workflow analysis outcomes into a single, cohesive, copied result structure.
 */
export class WorkflowAnalysisBuilder {
  /**
   * Aggregates result fields by copying arrays to ensure immutability.
   *
   * @param paths Traversed workflow paths
   * @param entities Workflow entities classified
   * @param boundaries Boundary intersections mapped
   * @param riskSignals Triggered risk signals
   * @param evidence Structured evidence packages
   * @returns Copied workflow analysis result package
   */
  public build(
    paths: WorkflowPath[],
    entities: WorkflowEntity[],
    boundaries: WorkflowBoundary[],
    riskSignals: WorkflowRiskSignal[],
    evidence: WorkflowEvidence[]
  ): WorkflowAnalysisResult {
    return {
      paths: [...paths],
      entities: [...entities],
      boundaries: [...boundaries],
      riskSignals: [...riskSignals],
      evidence: [...evidence]
    };
  }
}

