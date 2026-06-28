import { RuntimeRoleProfile, RuntimeSession, SessionIsolationBoundary } from './multi-session-runtime';

/**
 * @architecture_contract IExecutionGateway
 * @purpose Decouples the Intelligence layer from concrete browser execution infrastructure.
 * @responsibility Provides a data-driven boundary for isolated session execution and cleanup.
 * @invariants Context handles must remain completely opaque to higher-level intelligence.
 */
export interface IExecutionGateway {
  launchIsolatedSession(role: RuntimeRoleProfile, boundary?: SessionIsolationBoundary): Promise<RuntimeSession>;
  getPlaywrightContext(sessionId: string): any;
  getCredentialVault(): any;
  terminateSession(sessionId: string): Promise<void>;
  terminateAll(): Promise<void>;
}
