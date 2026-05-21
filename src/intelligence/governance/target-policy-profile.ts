/**
 * @canonical
 * Target Policy Profile Contracts
 * Defines the per-program execution boundaries. The runtime must think: "What am I allowed to do?"
 */

export type AllowedExecutionMode = 'READONLY_REPLAY' | 'SAFE_PERTURBATION' | 'DESTRUCTIVE_MUTATION_MOCKED';

export interface ReplayPermission {
  canReplay: boolean;
  maxReplayDepth: number;
}

export interface MutationPermission {
  canMutateIds: boolean;
  canMutateTenants: boolean;
  canMutateAuth: boolean;
  canMutateWorkflows: boolean;
}

export interface RateGovernanceRule {
  maxRequestsPerMinute: number;
  maxConcurrentSessions: number;
  coolDownPeriodMs: number;
}

export interface RestrictedRouteRule {
  routeRegex: string;
  restrictionReason: string;
}

export interface ApprovalRequirement {
  requiresHumanApprovalFor: string[];
}

export interface AutomationBoundary {
  allowedDomains: string[];
  restrictedRoutes: RestrictedRouteRule[];
  rateLimits: RateGovernanceRule;
}

export interface TargetPolicyProfile {
  profileId: string;
  targetName: string;
  executionMode: AllowedExecutionMode;
  replayPermissions: ReplayPermission;
  mutationPermissions: MutationPermission;
  automationBoundary: AutomationBoundary;
  approvalRequirements: ApprovalRequirement;
}
