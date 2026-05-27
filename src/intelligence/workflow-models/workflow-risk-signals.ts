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
  comparativeSignals?: Array<{
    type: 'ROLE_PATH_ASYMMETRY' | 'CROSS_ROLE_ACCESS_VARIANCE' | 'TRUST_BOUNDARY_INCONSISTENCY' | 'UNEXPECTED_PRIVILEGED_REACHABILITY';
    evidenceLinks: string[];
  }>;
  anomalySignals?: Array<{
    type: 'RARE_BOUNDARY_TRANSITION' | 'UNCOMMON_PRIVILEGE_PATH' | 'UNIQUE_TRUST_COLLAPSE' | 'STRUCTURAL_WORKFLOW_BYPASS';
    evidenceLinks: string[];
  }>;
}

