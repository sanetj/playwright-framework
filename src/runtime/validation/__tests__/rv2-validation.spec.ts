import { test, expect, APIResponse, APIRequestContext, BrowserContext } from '@playwright/test';
import { PlaywrightMultiSessionRuntime } from '../../execution/playwright-multi-session';
import { LivePerturbationInterceptor } from '../../instrumentation/live-perturbation-interceptor';
import { ReplayCaptureAdapter } from '../rv1-capture-adapter';
import { ControlledReplayHarness } from '../rv1-controlled-harness';
import { ExploitVerifier } from '../exploit-verifier';
import { ReplayCoordinator } from '../../replay/replay-coordinator';
import { ReplayMutationPlan } from '../../replay/replay-mutation-plan';
import { TargetSafetyProfile } from '../../../intelligence/perturbation/probe-safety';
import { RuntimeRoleProfile, SessionIsolationBoundary } from '../../../intelligence/runtime/multi-session-runtime';
import { ReplayInstabilityDetector } from '../rv2-instability-diagnostics';
import { HumanReadableEvidenceExporter } from '../rv2-evidence-exporter';
import {
  MOCK_ROTATING_AUTH_EXCHANGE,
  MOCK_DELAYED_REDIRECT_EXCHANGE,
  MOCK_SPA_TOKEN_REFRESH_EXCHANGE,
  MOCK_INCONSISTENT_QUERY_ORDER_EXCHANGE,
  MOCK_STALE_SESSION_COOKIE_EXCHANGE,
  MOCK_MIXED_CDN_HEADERS_EXCHANGE,
  MOCK_AUTH_DOWNGRADE_REDIRECT_EXCHANGE
} from '../rv2-chaotic-fixtures';

class MockAPIResponse implements APIResponse {
  constructor(
    private readonly _status: number,
    private readonly _headers: Record<string, string>,
    private readonly _bodyStr: string,
    private readonly _url: string
  ) {}

  public status(): number { return this._status; }
  public headers(): Record<string, string> { return this._headers; }
  public headersArray(): Array<{ name: string; value: string }> {
    return Object.entries(this._headers).map(([name, value]) => ({ name, value }));
  }
  public async body(): Promise<Buffer> { return Buffer.from(this._bodyStr, 'utf-8'); }
  public async text(): Promise<string> { return this._bodyStr; }
  public async json(): Promise<unknown> { return JSON.parse(this._bodyStr); }
  public ok(): boolean { return this._status >= 200 && this._status < 300; }
  public statusText(): string { return 'OK'; }
  public url(): string { return this._url; }
  public async dispose(): Promise<void> {}
  public async [Symbol.asyncDispose](): Promise<void> {}
}

class MockAPIRequestContext implements APIRequestContext {
  constructor(
    private readonly handler: (url: string, options?: unknown) => { status: number; headers?: Record<string, string>; bodyStr: string }
  ) {}

  public readonly tracing = {
    start: async () => {},
    stop: async () => {},
    startChunk: async () => {},
    stopChunk: async () => {},
    group: async () => ({
      dispose: async () => {},
      [Symbol.dispose]: () => {},
      [Symbol.asyncDispose]: async () => {}
    }),
    groupEnd: async () => {},
    startHar: async () => ({
      dispose: async () => {},
      [Symbol.dispose]: () => {},
      [Symbol.asyncDispose]: async () => {}
    }),
    stopHar: async () => {}
  };

  public async fetch(urlOrRequest: string, options?: unknown): Promise<APIResponse> {
    const res = this.handler(urlOrRequest, options);
    return new MockAPIResponse(res.status, res.headers || {}, res.bodyStr, urlOrRequest);
  }

  public async get(url: string, options?: unknown): Promise<APIResponse> {
    return this.fetch(url, { ...(options as Record<string, unknown>), method: 'GET' });
  }
  public async post(url: string, options?: unknown): Promise<APIResponse> {
    return this.fetch(url, { ...(options as Record<string, unknown>), method: 'POST' });
  }
  public async delete(url: string, options?: unknown): Promise<APIResponse> {
    return this.fetch(url, { ...(options as Record<string, unknown>), method: 'DELETE' });
  }
  public async head(url: string, options?: unknown): Promise<APIResponse> {
    return this.fetch(url, { ...(options as Record<string, unknown>), method: 'HEAD' });
  }
  public async patch(url: string, options?: unknown): Promise<APIResponse> {
    return this.fetch(url, { ...(options as Record<string, unknown>), method: 'PATCH' });
  }
  public async put(url: string, options?: unknown): Promise<APIResponse> {
    return this.fetch(url, { ...(options as Record<string, unknown>), method: 'PUT' });
  }
  public async dispose(): Promise<void> {}
  public async [Symbol.asyncDispose](): Promise<void> {}
  public async storageState(options?: { indexedDB?: boolean; path?: string }): Promise<{
    cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      expires: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'Strict' | 'Lax' | 'None';
    }>;
    origins: Array<{
      origin: string;
      localStorage: Array<{ name: string; value: string }>;
    }>;
  }> {
    return { cookies: [], origins: [] };
  }
}

function mockContextRequest(
  context: BrowserContext,
  handler: (url: string, options?: unknown) => { status: number; headers?: Record<string, string>; bodyStr: string }
): void {
  Object.defineProperty(context, 'request', {
    value: new MockAPIRequestContext(handler),
    configurable: true,
    writable: true
  });
}

test.describe('RV.2 — Semi-Chaotic Operational Validation Tests', () => {
  let runtime: PlaywrightMultiSessionRuntime;
  let interceptor: LivePerturbationInterceptor;
  let harness: ControlledReplayHarness;

  const safetyProfile: TargetSafetyProfile = {
    targetId: 'rv2-safety-profile',
    safeCategories: [
      {
        categoryId: 'safe-reads',
        allowedClasses: ['READ_ONLY']
      }
    ],
    requiresApprovalFor: []
  };

  test.beforeEach(() => {
    runtime = new PlaywrightMultiSessionRuntime(safetyProfile);
    interceptor = new LivePerturbationInterceptor();
    harness = new ControlledReplayHarness(runtime, interceptor);
  });

  test.afterEach(async () => {
    await runtime.terminateAll();
  });

  test('1. SPA redirect normalization stability', async () => {
    const role = {
      roleId: 'juice_anon',
      roleName: 'Juice Anon',
      tenantContext: { tenantId: 't-juice', tenantName: 'Juice Shop', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const boundary = {
      boundaryId: 'bnd_juice',
      enforceClearCookies: true,
      enforceClearLocalStorage: true,
      enforceClearSessionStorage: true,
      incognitoContext: true
    } as SessionIsolationBoundary;

    const session = await runtime.launchIsolatedSession(role, boundary);
    const context = runtime.getPlaywrightContext(session.sessionId);

    // Mock response simulating redirect
    mockContextRequest(context, () => {
      return {
        status: 302,
        headers: { 'location': '/login?delay=1&next=%2Fapi%2Fadministration&ts=12345' },
        bodyStr: 'Redirecting...'
      };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_delayed_redir',
      originalExecutionId: 'original',
      mutations: []
    };

    const run = await harness.executeSequentially([{
      exchange: MOCK_DELAYED_REDIRECT_EXCHANGE,
      targetSessionId: session.sessionId,
      mutationPlan: plan,
      reproducibilityCount: 1
    }]);

    expect(run[0].rejectionSignal).toBeDefined();
    expect(run[0].rejectionSignal!.category).toBe('REDIRECTED');
    expect(run[0].rejectionSignal!.normalizedLocation).toBe('/login?delay=1&next=%2Fapi%2Fadministration');
  });

  test('2. Token refresh drift tolerance', async () => {
    const adapter = new ReplayCaptureAdapter();
    const rawReq = {
      method: 'GET',
      url: 'http://localhost:3000/api/basket/1',
      headers: [
        { name: 'authorization', value: 'Bearer old-token-abc' },
        { name: 'cookie', value: 'session=cookie-old; csrf=n_12345' }
      ]
    };

    const normalized = adapter.normalizeRequest(rawReq);
    expect(normalized.headers.length).toBe(2);

    // Dynamic csrf parameters stripped successfully
    const cookieHeader = normalized.headers.find(h => h.name === 'cookie');
    expect(cookieHeader).toBeDefined();
    expect(cookieHeader!.value).toBe('session=cookie-old');
  });

  test('3. Cookie invalidation classification', async () => {
    const role = {
      roleId: 'juice_stale_role',
      roleName: 'Stale User',
      tenantContext: { tenantId: 't-juice', tenantName: 'Juice Shop', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const boundary = {
      boundaryId: 'bnd_juice',
      enforceClearCookies: true,
      enforceClearLocalStorage: true,
      enforceClearSessionStorage: true,
      incognitoContext: true
    } as SessionIsolationBoundary;

    const session = await runtime.launchIsolatedSession(role, boundary);
    const context = runtime.getPlaywrightContext(session.sessionId);

    // Mock cookie expiration triggers
    mockContextRequest(context, () => {
      return {
        status: 401,
        headers: { 'content-type': 'application/json' },
        bodyStr: '{"error": "Session has expired"}'
      };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_stale_session',
      originalExecutionId: 'original',
      mutations: []
    };

    const run = await harness.executeSequentially([{
      exchange: MOCK_STALE_SESSION_COOKIE_EXCHANGE,
      targetSessionId: session.sessionId,
      mutationPlan: plan,
      reproducibilityCount: 1
    }]);

    expect(run[0].rejectionSignal).toBeDefined();
    expect(run[0].rejectionSignal!.category).toBe('AUTH_EXPIRED');
    expect(run[0].rejectionSignal!.statusCode).toBe(401);
  });

  test('4. Replay instability diagnostics detection', async () => {
    const role = {
      roleId: 'juice_user_role',
      roleName: 'Standard User',
      tenantContext: { tenantId: 't-juice', tenantName: 'Juice Shop', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const boundary = {
      boundaryId: 'bnd_juice',
      enforceClearCookies: true,
      enforceClearLocalStorage: true,
      enforceClearSessionStorage: true,
      incognitoContext: true
    } as SessionIsolationBoundary;

    const session = await runtime.launchIsolatedSession(role, boundary);
    const context = runtime.getPlaywrightContext(session.sessionId);

    let count = 0;
    mockContextRequest(context, () => {
      count++;
      // Instability simulated: mismatching responses across runs
      if (count === 1) {
        return { status: 200, bodyStr: '{"items": 42}' };
      }
      return { status: 403, bodyStr: '{"differentKey": true}' };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_instability_test',
      originalExecutionId: 'original',
      mutations: []
    };

    const coord = new ReplayCoordinator();
    const verifier = new ExploitVerifier(runtime, coord);
    const evidence = await verifier.verifyExploit(
      MOCK_ROTATING_AUTH_EXCHANGE,
      session.sessionId,
      plan,
      interceptor,
      2
    );

    const detector = new ReplayInstabilityDetector();
    const diagnostic = detector.diagnose(evidence.evidenceCorrelation.consistencySignals, evidence);

    expect(diagnostic.hasInstability).toBe(true);
    expect(diagnostic.categories).toContain('REPLAY_INCONSISTENCY');
    expect(diagnostic.categories).toContain('NORMALIZATION_INSTABILITY');
  });

  test('5. Human-readable evidence export validation & 6. Replay lineage readability', async () => {
    const role = {
      roleId: 'juice_user_role',
      roleName: 'Standard User',
      tenantContext: { tenantId: 't-juice', tenantName: 'Juice Shop', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const boundary = {
      boundaryId: 'bnd_juice',
      enforceClearCookies: true,
      enforceClearLocalStorage: true,
      enforceClearSessionStorage: true,
      incognitoContext: true
    } as SessionIsolationBoundary;

    const session = await runtime.launchIsolatedSession(role, boundary);
    const context = runtime.getPlaywrightContext(session.sessionId);

    mockContextRequest(context, () => {
      return { status: 403, bodyStr: 'Access Forbidden' };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_human_export',
      originalExecutionId: 'original',
      mutations: []
    };

    const coord = new ReplayCoordinator();
    const verifier = new ExploitVerifier(runtime, coord);
    const evidence = await verifier.verifyExploit(
      MOCK_ROTATING_AUTH_EXCHANGE,
      session.sessionId,
      plan,
      interceptor,
      1
    );

    const detector = new ReplayInstabilityDetector();
    const diagnostic = detector.diagnose(evidence.evidenceCorrelation.consistencySignals, evidence);

    const exporter = new HumanReadableEvidenceExporter();
    const summary = exporter.exportHumanSummary(evidence, diagnostic);

    expect(summary.verdict).toBe('SECURE_OR_DENIED');
    expect(summary.originalTargetUri).toBe(MOCK_ROTATING_AUTH_EXCHANGE.request.url);
    expect(summary.lineageTrace).toContain('ORIG_ID: ex_rotating_auth');
    expect(summary.lineageTrace).toContain('VERDICT: SECURE_OR_DENIED');
  });

  test('7. Repeated replay reproducibility under chaotic inputs', async () => {
    const role = {
      roleId: 'juice_user_role',
      roleName: 'Standard User',
      tenantContext: { tenantId: 't-juice', tenantName: 'Juice Shop', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const boundary = {
      boundaryId: 'bnd_juice',
      enforceClearCookies: true,
      enforceClearLocalStorage: true,
      enforceClearSessionStorage: true,
      incognitoContext: true
    } as SessionIsolationBoundary;

    const session = await runtime.launchIsolatedSession(role, boundary);
    const context = runtime.getPlaywrightContext(session.sessionId);

    mockContextRequest(context, () => {
      return { status: 200, bodyStr: '{"products":[]}' };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_reproducibility_chaotic',
      originalExecutionId: 'original',
      mutations: []
    };

    const run1 = await harness.executeSequentially([{
      exchange: MOCK_MIXED_CDN_HEADERS_EXCHANGE,
      targetSessionId: session.sessionId,
      mutationPlan: plan,
      reproducibilityCount: 2
    }]);

    const run2 = await harness.executeSequentially([{
      exchange: MOCK_MIXED_CDN_HEADERS_EXCHANGE,
      targetSessionId: session.sessionId,
      mutationPlan: plan,
      reproducibilityCount: 2
    }]);

    const ser1 = JSON.stringify(run1[0]);
    const ser2 = JSON.stringify(run2[0]);
    expect(ser1).toBe(ser2);
  });

  test('8. Mixed transient header tolerance', () => {
    const adapter = new ReplayCaptureAdapter();
    const rawReq = {
      method: 'GET',
      url: 'http://localhost:3000/api/products',
      headers: [
        { name: 'cf-ray', value: 'ray-1' },
        { name: 'x-cdn-routing', value: 'node-us' },
        { name: 'x-request-id', value: 'req-abc' },
        { name: 'accept', value: 'application/json' }
      ]
    };

    const normalized = adapter.normalizeRequest(rawReq);
    expect(normalized.headers.length).toBe(1);
    expect(normalized.headers[0].name).toBe('accept');
  });

  test('9. Cross-session isolation preservation under rotating headers', async () => {
    const role1 = {
      roleId: 'rotating_user_1',
      roleName: 'Rotator A',
      tenantContext: { tenantId: 't-1', tenantName: 'Tenant 1', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const role2 = {
      roleId: 'rotating_user_2',
      roleName: 'Rotator B',
      tenantContext: { tenantId: 't-2', tenantName: 'Tenant 2', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const boundary = {
      boundaryId: 'bnd_juice',
      enforceClearCookies: true,
      enforceClearLocalStorage: true,
      enforceClearSessionStorage: true,
      incognitoContext: true
    } as SessionIsolationBoundary;

    runtime.getCredentialVault().storeCredentials({
      roleId: role1.roleId,
      headers: { 'Authorization': 'Bearer token-A-rotated' }
    });

    runtime.getCredentialVault().storeCredentials({
      roleId: role2.roleId,
      headers: { 'Authorization': 'Bearer token-B-rotated' }
    });

    const session1 = await runtime.launchIsolatedSession(role1, boundary);
    const session2 = await runtime.launchIsolatedSession(role2, boundary);

    const context1 = runtime.getPlaywrightContext(session1.sessionId);
    const context2 = runtime.getPlaywrightContext(session2.sessionId);

    let auth1 = '';
    mockContextRequest(context1, (url, options) => {
      const headers = (options as Record<string, unknown>)?.headers as Record<string, string> || {};
      auth1 = headers['authorization'] || '';
      return { status: 200, bodyStr: '{"success":true}' };
    });

    let auth2 = '';
    mockContextRequest(context2, (url, options) => {
      const headers = (options as Record<string, unknown>)?.headers as Record<string, string> || {};
      auth2 = headers['authorization'] || '';
      return { status: 200, bodyStr: '{"success":true}' };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_isolation_chaotic',
      originalExecutionId: 'original',
      mutations: []
    };

    await harness.executeSequentially([
      {
        exchange: MOCK_ROTATING_AUTH_EXCHANGE,
        targetSessionId: session1.sessionId,
        mutationPlan: plan,
        reproducibilityCount: 1
      },
      {
        exchange: MOCK_ROTATING_AUTH_EXCHANGE,
        targetSessionId: session2.sessionId,
        mutationPlan: plan,
        reproducibilityCount: 1
      }
    ]);

    expect(auth1).toBe('Bearer token-A-rotated');
    expect(auth2).toBe('Bearer token-B-rotated');
  });
});
