import { WorkflowDiscoveryResult } from '../../workflow-discovery/discovery-engine';

export interface WorkflowRiskRule {
  id: string;
  evaluate(
    discoveryResult: WorkflowDiscoveryResult
  ): boolean;
}

export const WORKFLOW_RISK_RULES: WorkflowRiskRule[] = [];
