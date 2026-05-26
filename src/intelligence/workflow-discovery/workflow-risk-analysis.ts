import { WorkflowRiskSignals } from '../workflow-models/workflow-risk-signals';

/**
 * WorkflowRiskAnalyzer
 * Maps structural workflow risk signals to deterministic triggered rule IDs.
 */
export class WorkflowRiskAnalyzer {
  public analyze(signals: WorkflowRiskSignals): string[] {
    const triggeredRuleIds: string[] = [];

    if (signals.containsAdminEntity && signals.crossesBoundary) {
      triggeredRuleIds.push('RULE_ADMIN_BOUNDARY');
    }
    if (signals.containsTenantBoundary) {
      triggeredRuleIds.push('RULE_TENANT_BOUNDARY');
    }
    if (signals.containsExternalEntity) {
      triggeredRuleIds.push('RULE_EXTERNAL_ACCESS');
    }

    return triggeredRuleIds;
  }
}
