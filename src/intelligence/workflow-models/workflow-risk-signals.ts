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
  topologySignals?: Array<{
    type: 'PRIVILEGE_AMPLIFICATION_PATH' | 'MULTI_BOUNDARY_ESCALATION' | 'REPEATED_TRUST_TRANSITIONS' | 'ROLE_CHAIN_ESCALATION';
    pathId: string;
    evidenceLinks: string[];
  }>;
}

