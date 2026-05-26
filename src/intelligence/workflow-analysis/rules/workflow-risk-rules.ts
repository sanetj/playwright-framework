import { WorkflowDiscoveryResult } from '../../workflow-discovery/discovery-engine';
import { WorkflowEntityCategory } from '../../workflow-models/workflow-classification';

export interface WorkflowRiskRule {
  id: string;
  evaluate(
    discoveryResult: WorkflowDiscoveryResult
  ): boolean;
}

const ADMIN_ENTITY_RULE: WorkflowRiskRule = {
  id: 'admin_entity_rule',
  evaluate(discoveryResult: WorkflowDiscoveryResult): boolean {
    return discoveryResult.entities.some(e => e.category === WorkflowEntityCategory.ADMIN);
  }
};

export const WORKFLOW_RISK_RULES: WorkflowRiskRule[] = [
  ADMIN_ENTITY_RULE
];
