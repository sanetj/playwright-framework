import { WorkflowDiscoveryResult } from '../workflow-discovery/discovery-engine';
import { WorkflowRiskSignals } from '../workflow-models/workflow-risk-signals';
import { WorkflowEntityCategory, WorkflowBoundaryType } from '../workflow-models/workflow-classification';
import { WORKFLOW_RISK_RULES } from './rules/workflow-risk-rules';

export class WorkflowRiskAnalysis {
  private readonly rules = WORKFLOW_RISK_RULES;

  public analyze(
    discoveryResult: WorkflowDiscoveryResult
  ): WorkflowRiskSignals {
    const { entities, boundaries } = discoveryResult;

    return {
      crossesBoundary: boundaries.length > 0,
      containsAdminEntity: entities.some(e => e.category === WorkflowEntityCategory.ADMIN),
      containsTenantBoundary: boundaries.some(b => b.boundaryType === WorkflowBoundaryType.TENANT),
      containsAuthEntity: entities.some(e => e.category === WorkflowEntityCategory.AUTH),
      containsExternalEntity: entities.some(e => e.category === WorkflowEntityCategory.EXTERNAL)
    };
  }
}
