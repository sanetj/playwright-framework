export interface WorkflowRiskSignals {
  crossesBoundary: boolean;
  containsAdminEntity: boolean;
  containsTenantBoundary: boolean;
  containsAuthEntity: boolean;
  containsExternalEntity: boolean;
  triggeredRuleIds?: string[];
  signalType?: string;
  exploitSignals?: Array<{
    type: 'CROSS_ROLE_TRANSITION' | 'TRUST_BOUNDARY_CROSSING' | 'WORKFLOW_GAP' | 'REPEATED_PRIVILEGED_PATH' | 'SUSPICIOUS_MULTI_BOUNDARY_FLOW';
    evidenceLinks: string[];
  }>;
}

