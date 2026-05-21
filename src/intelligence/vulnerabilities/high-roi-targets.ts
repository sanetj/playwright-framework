/**
 * @canonical
 * High-ROI Vulnerability Substrate
 * Focuses prioritization on economically valuable findings for bug bounty operational leverage.
 */

export type HighRoiVulnerabilityType =
  | 'IDOR'
  | 'AUTH_BYPASS'
  | 'PRIVILEGE_ESCALATION'
  | 'TENANT_ESCAPE'
  | 'WORKFLOW_ABUSE'
  | 'BUSINESS_LOGIC_FLAW';

export type ExploitabilityCategory = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type BoundaryViolationClass = 'CROSS_TENANT' | 'CROSS_ROLE' | 'UNAUTHENTICATED_ACCESS' | 'STATE_MACHINE_BYPASS';

export interface ReplayVerificationRequirement {
  requiresBaseReplayId: boolean;
  requiresPerturbedReplayId: boolean;
  requiredDifferentialEvidence: boolean;
}

export interface VulnerabilityProofRequirement {
  vulnerabilityType: HighRoiVulnerabilityType;
  verificationRequirements: ReplayVerificationRequirement;
  mandatoryEvidenceTags: string[];
}
