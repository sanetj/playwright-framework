/**
 * @canonical
 * Replay Safety Contracts
 * Classifies replay danger BEFORE execution. Deny-by-default for high-risk replays.
 */

export type ReplaySafetyLevel = 'SAFE' | 'ELEVATED' | 'HIGH_RISK' | 'CRITICAL';
export type ReplayRiskCategory = 'READONLY' | 'MUTATING' | 'PRIVILEGE_SENSITIVE' | 'PAYMENT_SENSITIVE' | 'RATE_SENSITIVE' | 'IRREVERSIBLE';
export type ReplayMutationClass = 'NONE' | 'ID_SWAP' | 'TENANT_SWAP' | 'AUTH_STRIP' | 'SEQUENCE_ALTERATION';

export interface SensitiveWorkflowType {
  workflowId: string;
  riskCategory: ReplayRiskCategory;
  description: string;
}

export interface ReplayApprovalRequirement {
  isRequired: boolean;
  reason: string;
  requiredRole?: string;
}

export interface ReplaySafetyClassification {
  classificationId: string;
  safetyLevel: ReplaySafetyLevel;
  identifiedRisks: ReplayRiskCategory[];
  mutationClass: ReplayMutationClass;
  sensitiveWorkflowsInvolved: SensitiveWorkflowType[];
  approvalRequirement: ReplayApprovalRequirement;
  explainabilityMetadata: string[];
}
