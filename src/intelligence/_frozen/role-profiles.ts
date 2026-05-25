/**
 * @canonical
 * Role Profile Contracts
 * Reusable role identities for launching isolated multi-session runtime contexts.
 */

export interface TenantProfile {
  tenantId: string;
  tenantDomain?: string;
  isIsolated: boolean;
}

export interface CredentialProfile {
  credentialId: string;
  authMethod: 'BEARER_TOKEN' | 'COOKIE' | 'BASIC_AUTH' | 'OAUTH2';
  safeReferenceId: string; // Do not store raw secrets in memory where possible, use secure vaults
}

export interface RoleCapabilityExpectation {
  expectationId: string;
  expectedAccessibleRoutes: string[];
  expectedRestrictedRoutes: string[];
  expectedReadableEntities: string[];
  expectedMutatableEntities: string[];
}

export interface SessionBootstrapStrategy {
  strategyId: string;
  loginWorkflowId?: string; // If login needs to be replayed
  injectedCredentialsId?: string; // If session is bootstrapped directly via tokens
  clearCacheBeforeBootstrap: boolean;
}

export interface RoleProfile {
  profileId: string;
  roleName: string;
  roleLevel: 'ANONYMOUS' | 'AUTHENTICATED' | 'ELEVATED' | 'ADMIN';
  tenantProfile?: TenantProfile;
  credentialProfile?: CredentialProfile;
  bootstrapStrategy: SessionBootstrapStrategy;
  capabilityExpectations: RoleCapabilityExpectation;
}
