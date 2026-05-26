import { Browser, BrowserContext, chromium } from '@playwright/test';
import {
  MultiSessionRuntime,
  RuntimeSession,
  RuntimeRoleProfile,
  SessionIsolationBoundary,
  DifferentialExecutionContext
} from '../../intelligence/runtime/multi-session-runtime';
import { RuntimePolicyGateway } from '../governance/runtime-policy-gateway';
import { ReplayExecutionIntent } from '../safety/replay-safety-classifier';
import { TargetSafetyProfile } from '../../intelligence/perturbation/probe-safety';
import { CredentialVault } from './credential-vault';

export class PlaywrightMultiSessionRuntime implements MultiSessionRuntime {
  public orchestrationId: string = `orch_${Date.now()}`;
  public activeSessions = new Map<string, RuntimeSession>();
  public differentialContexts: DifferentialExecutionContext[] = [];

  private browser: Browser | null = null;
  private playwrightContexts = new Map<string, BrowserContext>();
  private policyGateway: RuntimePolicyGateway;

  constructor(
    targetSafetyProfile: TargetSafetyProfile,
    private credentialVault: CredentialVault = new CredentialVault()
  ) {
    this.policyGateway = new RuntimePolicyGateway(targetSafetyProfile);
  }

  public getCredentialVault(): CredentialVault {
    return this.credentialVault;
  }

  public async launchIsolatedSession(role: RuntimeRoleProfile, boundary: SessionIsolationBoundary): Promise<RuntimeSession> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }

    // 1. Policy Gate: Check if launching this session violates target profiles.
    const intent: ReplayExecutionIntent = {
      method: 'LAUNCH',
      url: 'about:blank',
      isMutationAttempt: false
    };
    await this.policyGateway.authorize(intent);

    // 2. Execution: Launch the incognito context
    const context = await this.browser.newContext();

    // 3. Credential Injection
    const creds = this.credentialVault.getCredentials(role.roleId);
    if (creds) {
      if (creds.cookies && creds.cookies.length > 0) {
        await context.addCookies(creds.cookies);
      }
      if (creds.headers) {
        await context.setExtraHTTPHeaders(creds.headers);
      }
    }

    // Store the Playwright context out-of-band to prevent it from leaking into Canonical Graph
    const sessionId = `session_${role.roleId}_${Date.now()}`;
    this.playwrightContexts.set(sessionId, context);

    const session: RuntimeSession = {
      sessionId,
      roleProfile: role,
      isolationBoundary: boundary,
      replayChannel: {
        channelId: `ch_${sessionId}`,
        sessionId,
        isRecording: true,
        capturedEventIds: []
      },
      startedAtTs: Date.now(),
      status: 'ACTIVE'
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  public async terminateSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const context = this.playwrightContexts.get(sessionId);
    if (context) {
      await context.close();
      this.playwrightContexts.delete(sessionId);
    }

    session.status = 'TERMINATED';
  }

  public async terminateAll(): Promise<void> {
    for (const sessionId of Array.from(this.activeSessions.keys())) {
      await this.terminateSession(sessionId);
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  public generateDifferentialContext(baseRole: string, comparisonRoles: string[]): DifferentialExecutionContext {
    const baseSessions = Array.from(this.activeSessions.values()).filter(s => s.roleProfile.roleId === baseRole);
    if (baseSessions.length === 0) throw new Error(`No active session found for base role: ${baseRole}`);

    const baseSessionId = baseSessions[0].sessionId;
    const comparisonSessionIds = Array.from(this.activeSessions.values())
      .filter(s => comparisonRoles.includes(s.roleProfile.roleId))
      .map(s => s.sessionId);

    const context: DifferentialExecutionContext = {
      contextId: `diff_ctx_${Date.now()}`,
      baseSessionId,
      comparisonSessionIds,
      targetWorkflowId: 'unknown'
    };

    this.differentialContexts.push(context);
    return context;
  }

  // Adapter method to get the Playwright Context for network hooking layer.
  // Warning: Do NOT expose this to the Intelligence Kernel.
  public getPlaywrightContext(sessionId: string): BrowserContext {
    const ctx = this.playwrightContexts.get(sessionId);
    if (!ctx) throw new Error(`No Playwright context found for session ${sessionId}`);
    return ctx;
  }
}

