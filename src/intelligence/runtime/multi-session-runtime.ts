/**
 * @canonical
 * Multi-Session Orchestration
 * Coordinates isolated runtime sessions across multiple roles. Strict isolation, no cross-contamination.
 */

export interface RuntimeTenantContext {
  tenantId: string;
  tenantName: string;
  isolationLevel: 'DEDICATED' | 'SHARED';
}

export interface RuntimeRoleProfile {
  roleId: string;
  roleName: string; // e.g., 'anonymous', 'user', 'admin'
  tenantContext?: RuntimeTenantContext;
}

export interface SessionIsolationBoundary {
  boundaryId: string;
  enforceClearCookies: boolean;
  enforceClearLocalStorage: boolean;
  enforceClearSessionStorage: boolean;
  incognitoContext: boolean;
}

export interface SessionReplayChannel {
  channelId: string;
  sessionId: string;
  isRecording: boolean;
  capturedEventIds: string[];
}

export interface DifferentialExecutionContext {
  contextId: string;
  baseSessionId: string;
  comparisonSessionIds: string[];
  targetWorkflowId: string;
}

export interface RuntimeSession {
  sessionId: string;
  roleProfile: RuntimeRoleProfile;
  isolationBoundary: SessionIsolationBoundary;
  replayChannel: SessionReplayChannel;
  startedAtTs: number;
  status: 'ACTIVE' | 'TERMINATED' | 'CRASHED';
}

export interface MultiSessionRuntime {
  orchestrationId: string;
  activeSessions: Map<string, RuntimeSession>;
  differentialContexts: DifferentialExecutionContext[];
  
  launchIsolatedSession(role: RuntimeRoleProfile, boundary: SessionIsolationBoundary): Promise<RuntimeSession>;
  terminateSession(sessionId: string): Promise<void>;
  generateDifferentialContext(baseRole: string, comparisonRoles: string[]): DifferentialExecutionContext;
}
