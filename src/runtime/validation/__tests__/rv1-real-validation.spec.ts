import { test, expect, APIResponse, APIRequestContext, BrowserContext } from '@playwright/test';
import { PlaywrightMultiSessionRuntime } from '../../execution/playwright-multi-session';
import { LivePerturbationInterceptor } from '../../instrumentation/live-perturbation-interceptor';
import { ReplayCaptureAdapter } from '../rv1-capture-adapter';
import { ControlledReplayHarness } from '../rv1-controlled-harness';
import { CanonicalHttpExchange } from '../../evidence/canonical-http-evidence';
import { ReplayMutationPlan } from '../../replay/replay-mutation-plan';
import { TargetSafetyProfile } from '../../../intelligence/perturbation/probe-safety';
import { RuntimeRoleProfile, SessionIsolationBoundary } from '../../../intelligence/runtime/multi-session-runtime';
import {
  MOCK_JUICE_SHOP_BAC_EXCHANGE,
  MOCK_PORTSWIGGER_IDOR_EXCHANGE,
  MOCK_CSRF_REJECTION_EXCHANGE,
  MOCK_AUTH_REDIRECT_EXCHANGE
} from '../rv1-replay-fixtures';

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

test.describe('RV.1B — Controlled Real-Lab Replay Validation Tests', () => {
  let runtime: PlaywrightMultiSessionRuntime;
  let interceptor: LivePerturbationInterceptor;
  let harness: ControlledReplayHarness;

  const safetyProfile: TargetSafetyProfile = {
    targetId: 'rv1b-safety-profile',
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

  test('1. Real replay capture normalization (headers sorting, cookie cleaning, stripping)', () => {
    const adapter = new ReplayCaptureAdapter();
    const rawRequest = {
      method: 'GET',
      url: 'http://localhost:3000/api/users',
      headers: [
        { name: 'User-Agent', value: 'Mozilla/5.0' },
        { name: 'cf-ray', value: '123456789cf' },
        { name: 'Cookie', value: 'session=abc123val; csrf=token999; nonce=123ts; theme=dark' },
        { name: 'X-Request-Id', value: 'req-abc-123' },
        { name: 'Accept', value: 'application/json' }
      ]
    };

    const normalized = adapter.normalizeRequest(rawRequest);

    expect(normalized.method).toBe('GET');
    expect(normalized.url).toBe('http://localhost:3000/api/users');
    
    // Accept, Cookie, User-Agent are preserved. cf-ray and X-Request-Id are stripped!
    expect(normalized.headers.length).toBe(3);

    // Assert sorting order (accept, cookie, user-agent)
    expect(normalized.headers[0].name).toBe('accept');
    expect(normalized.headers[1].name).toBe('cookie');
    expect(normalized.headers[2].name).toBe('user-agent');

    // Assert dynamic cookie names (csrf, nonce) were stripped from the cookie string!
    expect(normalized.headers[1].value).toBe('session=abc123val; theme=dark');
  });

  test('2. Replay evidence reproducibility & 9. Byte-identical consecutive outputs', async () => {
    const role = {
      roleId: 'juice_user_role',
      roleName: 'Standard Juice User',
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

    // Mock stable BAC response
    mockContextRequest(context, (url) => {
      if (url.includes('/api/administration')) {
        return {
          status: 200,
          headers: { 'content-type': 'application/json' },
          bodyStr: JSON.stringify({ success: true, adminData: {} })
        };
      }
      return { status: 404, bodyStr: 'Not found' };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_juice_bac_sequential',
      originalExecutionId: 'original',
      mutations: [{ type: 'AUTH_STRIP', targetHeader: 'cookie' }]
    };

    // Sequential verification 1
    const run1 = await harness.executeSequentially([{
      exchange: MOCK_JUICE_SHOP_BAC_EXCHANGE,
      targetSessionId: session.sessionId,
      mutationPlan: plan,
      reproducibilityCount: 2
    }]);

    // Sequential verification 2
    const run2 = await harness.executeSequentially([{
      exchange: MOCK_JUICE_SHOP_BAC_EXCHANGE,
      targetSessionId: session.sessionId,
      mutationPlan: plan,
      reproducibilityCount: 2
    }]);

    expect(run1.length).toBe(1);
    expect(run2.length).toBe(1);

    // Outputs must be strictly byte-identical under serialization
    const ser1 = JSON.stringify(run1[0]);
    const ser2 = JSON.stringify(run2[0]);
    expect(ser1).toBe(ser2);

    // Generate lineage summaries
    const summary1 = harness.generateLineageSummary(run1[0]);
    const summary2 = harness.generateLineageSummary(run2[0]);

    expect(summary1.isExploited).toBe(true);
    expect(summary2.isExploited).toBe(true);
    expect(summary1.originalExchangeId).toBe(MOCK_JUICE_SHOP_BAC_EXCHANGE.exchangeId.id);
    expect(summary1.normalizedUri).toBe(MOCK_JUICE_SHOP_BAC_EXCHANGE.request.url);
  });

  test('3. Cross-session isolation preservation & 8. No credential contamination', async () => {
    const role1 = {
      roleId: 'user_a',
      roleName: 'User A',
      tenantContext: { tenantId: 't-a', tenantName: 'Tenant A', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const role2 = {
      roleId: 'user_b',
      roleName: 'User B',
      tenantContext: { tenantId: 't-b', tenantName: 'Tenant B', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const boundary = {
      boundaryId: 'bnd_isolation',
      enforceClearCookies: true,
      enforceClearLocalStorage: true,
      enforceClearSessionStorage: true,
      incognitoContext: true
    } as SessionIsolationBoundary;

    // Separate credentials stored inside multi-session vault
    runtime.getCredentialVault().storeCredentials({
      roleId: role1.roleId,
      headers: { 'Authorization': 'TokenA' }
    });
    runtime.getCredentialVault().storeCredentials({
      roleId: role2.roleId,
      headers: { 'Authorization': 'TokenB' }
    });

    const sessionA = await runtime.launchIsolatedSession(role1, boundary);
    const sessionB = await runtime.launchIsolatedSession(role2, boundary);

    const contextA = runtime.getPlaywrightContext(sessionA.sessionId);
    const contextB = runtime.getPlaywrightContext(sessionB.sessionId);

    let authA = '';
    mockContextRequest(contextA, (url, options) => {
      const headers = (options as Record<string, unknown>)?.headers as Record<string, string> || {};
      authA = headers['authorization'] || '';
      return { status: 200, bodyStr: '{"ok":true}' };
    });

    let authB = '';
    mockContextRequest(contextB, (url, options) => {
      const headers = (options as Record<string, unknown>)?.headers as Record<string, string> || {};
      authB = headers['authorization'] || '';
      return { status: 200, bodyStr: '{"ok":true}' };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_idor_seq',
      originalExecutionId: 'original',
      mutations: [{ type: 'IDOR_INJECT', targetParam: 'query', injectedValue: '1002' }]
    };

    // Sequential runs
    await harness.executeSequentially([
      {
        exchange: MOCK_PORTSWIGGER_IDOR_EXCHANGE,
        targetSessionId: sessionA.sessionId,
        mutationPlan: plan,
        reproducibilityCount: 1
      },
      {
        exchange: MOCK_PORTSWIGGER_IDOR_EXCHANGE,
        targetSessionId: sessionB.sessionId,
        mutationPlan: plan,
        reproducibilityCount: 1
      }
    ]);

    // Ensure session contexts kept credentials isolated and sequential execution prevented leaks
    expect(authA).toBe('TokenA');
    expect(authB).toBe('TokenB');
  });

  test('4. Redirect normalization stability', async () => {
    const role = {
      roleId: 'juice_visitor',
      roleName: 'Visitor',
      tenantContext: { tenantId: 't-3', tenantName: 'Tenant 3', isolationLevel: 'DEDICATED' }
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

    // Mock dynamic redirects containing shifting transient nonces/timestamps
    let count = 0;
    mockContextRequest(context, () => {
      count++;
      return {
        status: 302,
        headers: { 'location': `/login?nonce=rand${count}&ts=98765${count}&dest=/api/users` },
        bodyStr: 'Redirecting...'
      };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_auth_redirect',
      originalExecutionId: 'original',
      mutations: []
    };

    const run = await harness.executeSequentially([{
      exchange: MOCK_AUTH_REDIRECT_EXCHANGE,
      targetSessionId: session.sessionId,
      mutationPlan: plan,
      reproducibilityCount: 1
    }]);

    expect(run[0].rejectionSignal).toBeDefined();
    expect(run[0].rejectionSignal!.category).toBe('REDIRECTED');
    expect(run[0].rejectionSignal!.statusCode).toBe(302);
    // Verified sorting and stripped nonces/timestamps from the Location query!
    expect(run[0].rejectionSignal!.normalizedLocation).toBe('/login?dest=%2Fapi%2Fusers');
  });

  test('5. CSRF rejection classification', async () => {
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

    // Mock dynamic CSRF fail responses
    mockContextRequest(context, () => {
      return {
        status: 403,
        headers: { 'content-type': 'application/json' },
        bodyStr: '{"message": "CSRF validation failed"}'
      };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_csrf_rejection',
      originalExecutionId: 'original',
      mutations: []
    };

    const run = await harness.executeSequentially([{
      exchange: MOCK_CSRF_REJECTION_EXCHANGE,
      targetSessionId: session.sessionId,
      mutationPlan: plan,
      reproducibilityCount: 1
    }]);

    expect(run[0].structuralVerificationOutcome.isExploited).toBe(false);
    expect(run[0].rejectionSignal).toBeDefined();
    expect(run[0].rejectionSignal!.category).toBe('CSRF_REJECTED');
    expect(run[0].rejectionSignal!.statusCode).toBe(403);
  });

  test('6. Anti-automation classification', async () => {
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

    // Mock CAPTCHA cloudflare page
    mockContextRequest(context, () => {
      return {
        status: 429,
        headers: { 'content-type': 'text/html' },
        bodyStr: '<html><body>Please solve the recaptcha to continue.</body></html>'
      };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_antibot_fail',
      originalExecutionId: 'original',
      mutations: []
    };

    const run = await harness.executeSequentially([{
      exchange: MOCK_JUICE_SHOP_BAC_EXCHANGE,
      targetSessionId: session.sessionId,
      mutationPlan: plan,
      reproducibilityCount: 1
    }]);

    expect(run[0].structuralVerificationOutcome.isExploited).toBe(false);
    expect(run[0].rejectionSignal).toBeDefined();
    expect(run[0].rejectionSignal!.category).toBe('ANTI_AUTOMATION_BLOCK');
    expect(run[0].rejectionSignal!.statusCode).toBe(429);
  });

  test('7. Stable exploit evidence serialization', async () => {
    const role = {
      roleId: 'juice_visitor',
      roleName: 'Visitor',
      tenantContext: { tenantId: 't-3', tenantName: 'Tenant 3', isolationLevel: 'DEDICATED' }
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
      return { status: 403, bodyStr: 'Access Denied' };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_serialization',
      originalExecutionId: 'original',
      mutations: []
    };

    const run = await harness.executeSequentially([{
      exchange: MOCK_JUICE_SHOP_BAC_EXCHANGE,
      targetSessionId: session.sessionId,
      mutationPlan: plan,
      reproducibilityCount: 1
    }]);

    const evidence = run[0];

    // Assert deep-frozen invariants
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence.evidenceCorrelation)).toBe(true);

    // Serialization verification
    const serialized = JSON.stringify(evidence);
    const parsed = JSON.parse(serialized);

    expect(parsed.evidenceId).toBe(evidence.evidenceId);
    expect(parsed.originalExchange.exchangeId.id).toBe(evidence.originalExchange.exchangeId.id);
  });
});
