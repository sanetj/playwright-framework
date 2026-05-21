/**
 * @canonical
 * Probe Safety Classification Contracts
 * Classifies replay probes according to destructive risk and workflow sensitivity.
 */

export type ProbeSafetyClass = 'READ_ONLY' | 'LOW_IMPACT' | 'STATE_MUTATION' | 'CROSS_TENANT' | 'HIGH_RISK';

export interface ProbeMutationRisk {
  riskId: string;
  isDestructive: boolean;
  canExposePiData: boolean;
  canCorruptDatabase: boolean;
}

export interface SafeMutationCategory {
  categoryId: string;
  allowedClasses: ProbeSafetyClass[];
}

export interface ReplayMutationImpact {
  impactScore: number;
  expectedBlastRadius: 'SESSION_ONLY' | 'TENANT_WIDE' | 'GLOBAL';
}

export interface TargetSafetyProfile {
  targetId: string;
  safeCategories: SafeMutationCategory[];
  requiresApprovalFor: ProbeSafetyClass[];
}

export interface ProbeExecutionApproval {
  approvalId: string;
  probeId: string;
  approvedByPolicyId: string;
  approvedAtTs: number;
}
