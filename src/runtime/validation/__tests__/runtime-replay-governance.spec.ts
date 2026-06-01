import { test, expect, APIResponse, APIRequestContext, BrowserContext } from '@playwright/test';
import { PlaywrightMultiSessionRuntime } from '../../execution/playwright-multi-session';
import { ReplayCoordinator } from '../../replay/replay-coordinator';
import { LivePerturbationInterceptor } from '../../instrumentation/live-perturbation-interceptor';
import { ExploitVerifier } from '../exploit-verifier';
import { CanonicalHttpExchange } from '../../evidence/canonical-http-evidence';
import { ReplayMutationPlan } from '../../replay/replay-mutation-plan';
import { TargetSafetyProfile } from '../../../intelligence/perturbation/probe-safety';
import { RuntimeRoleProfile, SessionIsolationBoundary } from '../../../intelligence/runtime/multi-session-runtime';
import { normalizeLocationUrl, ReplayRejectionClassifier } from '../runtime-replay-governance';

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
    private readonly handler: (url: string, options?: any) => { status: number; headers?: Record<string, string>; bodyStr: string }
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

  public async fetch(urlOrRequest: string, options?: any): Promise<APIResponse> {
    const res = this.handler(urlOrRequest, options);
    return new MockAPIResponse(res.status, res.headers || {}, res.bodyStr, urlOrRequest);
  }

  public async get(url: string, options?: any): Promise<APIResponse> {
    return this.fetch(url, { ...options, method: 'GET' });
  }
  public async post(url: string, options?: any): Promise<APIResponse> {
    return this.fetch(url, { ...options, method: 'POST' });
  }
  public async delete(url: string, options?: any): Promise<APIResponse> {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }
  public async head(url: string, options?: any): Promise<APIResponse> {
    return this.fetch(url, { ...options, method: 'HEAD' });
  }
  public async patch(url: string, options?: any): Promise<APIResponse> {
    return this.fetch(url, { ...options, method: 'PATCH' });
  }
  public async put(url: string, options?: any): Promise<APIResponse> {
    return this.fetch(url, { ...options, method: 'PUT' });
  }
  public async dispose(): Promise<void> {}
  public async [Symbol.asyncDispose](): Promise<void> {}
  public async storageState(options?: { indexedDB?: boolean }): Promise<any> { return {}; }
}

function mockContextRequest(
  context: BrowserContext,
  handler: (url: string, options?: any) => { status: number; headers?: Record<string, string>; bodyStr: string }
): void {
  Object.defineProperty(context, 'request', {
    value: new MockAPIRequestContext(handler),
    configurable: true,
    writable: true
  });
}

test.describe('Runtime Replay Governance & Rejection Classification (Phase 9.5 Slice 4)', () => {
  let runtime: PlaywrightMultiSessionRuntime;
  let verifier: ExploitVerifier;
  let interceptor: LivePerturbationInterceptor;

  const safetyProfile: TargetSafetyProfile = {
    targetId: 'test-governance-profile',
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
  });

  test.afterEach(async () => {
    await runtime.terminateAll();
  });

  test('1. Rotating CSRF token rejection detection', async () => {
    const role: RuntimeRoleProfile = { roleId: 'user_a', roleName: 'User A', tenantContext: { tenantId: 'tenant-a', tenantName: 'Tenant A', isolationLevel: 'DEDICATED' } };
    const boundary: SessionIsolationBoundary = { boundaryId: 'bnd_1', enforceClearCookies: true, enforceClearLocalStorage: true, enforceClearSessionStorage: true, incognitoContext: true };
    const session = await runtime.launchIsolatedSession(role, boundary);
    const context = runtime.getPlaywrightContext(session.sessionId);

    // Mock handler returning CSRF block
    mockContextRequest(context, () => ({
      status: 403,
      bodyStr: '{"error": "Forbidden: missing or invalid CSRF token"}'
    }));

    const originalExchange: CanonicalHttpExchange = {
      exchangeId: { id: 'ex_csrf', requestFingerprint: 'rf_csrf', navigationId: 'n1', sequenceNumber: 1 },
      sessionId: session.sessionId,
      timestamp: 1716912345000,
      request: { method: 'GET', url: 'http://localhost:3000/api/resource', headers: [] },
      response: { status: 403, headers: [], bodyStr: 'Denied' },
      source: 'playwright'
    };

    const plan: ReplayMutationPlan = { planId: 'mut_csrf', originalExecutionId: 'original', mutations: [] };
    const coord = new ReplayCoordinator();
    const ver = new ExploitVerifier(runtime, coord);
    const evidence = await ver.verifyExploit(originalExchange, session.sessionId, plan, interceptor, 2);

    expect(evidence.rejectionSignal).toBeDefined();
    expect(evidence.rejectionSignal!.category).toBe('CSRF_REJECTED');
    expect(evidence.rejectionSignal!.statusCode).toBe(403);
    expect(evidence.rejectionSignal!.deterministicReason).toContain('CSRF rejection detected');
  });

  test('2. Auth redirect drift handling and stable path normalization', async () => {
    const role: RuntimeRoleProfile = { roleId: 'user_a', roleName: 'User A', tenantContext: { tenantId: 'tenant-a', tenantName: 'Tenant A', isolationLevel: 'DEDICATED' } };
    const boundary: SessionIsolationBoundary = { boundaryId: 'bnd_1', enforceClearCookies: true, enforceClearLocalStorage: true, enforceClearSessionStorage: true, incognitoContext: true };
    const session = await runtime.launchIsolatedSession(role, boundary);
    const context = runtime.getPlaywrightContext(session.sessionId);

    let count = 0;
    mockContextRequest(context, () => {
      count++;
      // Dynamically shifts nonces/timestamps in query params
      return {
        status: 302,
        headers: {
          'location': `/login?nonce=abc${count}&ts=1234${count}&target=/api/resource`
        },
        bodyStr: 'Redirecting...'
      };
    });

    const originalExchange: CanonicalHttpExchange = {
      exchangeId: { id: 'ex_redir', requestFingerprint: 'rf_redir', navigationId: 'n1', sequenceNumber: 1 },
      sessionId: session.sessionId,
      timestamp: 1716912345000,
      request: { method: 'GET', url: 'http://localhost:3000/api/resource', headers: [] },
      response: { status: 403, headers: [], bodyStr: 'Denied' },
      source: 'playwright'
    };

    const plan: ReplayMutationPlan = { planId: 'mut_redir', originalExecutionId: 'original', mutations: [] };
    const coord = new ReplayCoordinator();
    const ver = new ExploitVerifier(runtime, coord);
    const evidence = await ver.verifyExploit(originalExchange, session.sessionId, plan, interceptor, 2);

    // Dynamic redirect nonces must be completely tolerated under stable normalization
    expect(evidence.evidenceCorrelation.replayDriftDetected).toBe(false);
    expect(evidence.rejectionSignal).toBeDefined();
    expect(evidence.rejectionSignal!.category).toBe('REDIRECTED');
    expect(evidence.rejectionSignal!.normalizedLocation).toBe('/login?target=%2Fapi%2Fresource'); // Query sorted and nonces stripped!
  });

  test('3. Soft session expiration mapping', async () => {
    const classifier = new ReplayRejectionClassifier();
    const sig = classifier.classify(401, [], '{"msg":"your token has expired, please re-authenticate"}');
    expect(sig).toBeDefined();
    expect(sig!.category).toBe('AUTH_EXPIRED');
    expect(sig!.statusCode).toBe(401);
  });

  test('4. Transient nonce headers tolerance verification', async () => {
    const role: RuntimeRoleProfile = { roleId: 'user_a', roleName: 'User A', tenantContext: { tenantId: 'tenant-a', tenantName: 'Tenant A', isolationLevel: 'DEDICATED' } };
    const boundary: SessionIsolationBoundary = { boundaryId: 'bnd_1', enforceClearCookies: true, enforceClearLocalStorage: true, enforceClearSessionStorage: true, incognitoContext: true };
    const session = await runtime.launchIsolatedSession(role, boundary);
    const context = runtime.getPlaywrightContext(session.sessionId);

    let count = 0;
    mockContextRequest(context, () => {
      count++;
      return {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-nonce': `nonce-${count}` // Shifting nonce header
        },
        bodyStr: '{"ok":true}'
      };
    });

    const originalExchange: CanonicalHttpExchange = {
      exchangeId: { id: 'ex_nonce', requestFingerprint: 'rf_nonce', navigationId: 'n1', sequenceNumber: 1 },
      sessionId: session.sessionId,
      timestamp: 1716912345000,
      request: { method: 'GET', url: 'http://localhost:3000/api/resource', headers: [] },
      response: { status: 403, headers: [], bodyStr: 'Denied' },
      source: 'playwright'
    };

    const plan: ReplayMutationPlan = { planId: 'mut_nonce', originalExecutionId: 'original', mutations: [] };
    const coord = new ReplayCoordinator();
    const ver = new ExploitVerifier(runtime, coord);
    const evidence = await ver.verifyExploit(originalExchange, session.sessionId, plan, interceptor, 2);

    expect(evidence.evidenceCorrelation.replayDriftDetected).toBe(false);
    expect(evidence.evidenceCorrelation.consistencySignals[1].headersMatch).toBe(true);
  });

  test('5. Anti-bot CAPTCHA block recognition', async () => {
    const classifier = new ReplayRejectionClassifier();
    const sig = classifier.classify(403, [], '<html>CF bot verification. please resolve captcha</html>');
    expect(sig).toBeDefined();
    expect(sig!.category).toBe('ANTI_AUTOMATION_BLOCK');
    expect(sig!.statusCode).toBe(403);
  });

  test('6. Cookie invalidation detection', async () => {
    const classifier = new ReplayRejectionClassifier();
    const sig = classifier.classify(401, [], '{"error":"invalid session token or cookie"}');
    expect(sig).toBeDefined();
    expect(sig!.category).toBe('SESSION_INVALIDATED');
  });

  test('7. Replayed auth downgrade fallback classification', async () => {
    const classifier = new ReplayRejectionClassifier();
    const sig = classifier.classify(403, [], '{"error":"unauthorized access to resource"}');
    expect(sig).toBeDefined();
    expect(sig!.category).toBe('ACCESS_DENIED');
  });

  test('8. SPA delayed redirect simulation', async () => {
    const role: RuntimeRoleProfile = { roleId: 'user_a', roleName: 'User A', tenantContext: { tenantId: 'tenant-a', tenantName: 'Tenant A', isolationLevel: 'DEDICATED' } };
    const boundary: SessionIsolationBoundary = { boundaryId: 'bnd_1', enforceClearCookies: true, enforceClearLocalStorage: true, enforceClearSessionStorage: true, incognitoContext: true };
    const session = await runtime.launchIsolatedSession(role, boundary);
    const context = runtime.getPlaywrightContext(session.sessionId);

    let count = 0;
    mockContextRequest(context, () => {
      count++;
      return {
        status: 200,
        bodyStr: JSON.stringify({
          spaRedirect: '/unauthorized',
          timestamp: 1716912345000 + count // Ignored transient JSON path!
        })
      };
    });

    const originalExchange: CanonicalHttpExchange = {
      exchangeId: { id: 'ex_spa', requestFingerprint: 'rf_spa', navigationId: 'n1', sequenceNumber: 1 },
      sessionId: session.sessionId,
      timestamp: 1716912345000,
      request: { method: 'GET', url: 'http://localhost:3000/api/resource', headers: [] },
      response: { status: 403, headers: [], bodyStr: 'Denied' },
      source: 'playwright'
    };

    const plan: ReplayMutationPlan = { planId: 'mut_spa', originalExecutionId: 'original', mutations: [] };
    const coord = new ReplayCoordinator();
    const ver = new ExploitVerifier(runtime, coord);
    const evidence = await ver.verifyExploit(originalExchange, session.sessionId, plan, interceptor, 2);

    expect(evidence.evidenceCorrelation.replayDriftDetected).toBe(false);
    expect(evidence.evidenceCorrelation.consistencySignals[1].bodyStructureMatch).toBe(true);
  });

  test('9. Playwright lifecycle context isolation guarantees', async () => {
    const role1: RuntimeRoleProfile = { roleId: 'user_1', roleName: 'User 1', tenantContext: { tenantId: 'tenant-1', tenantName: 'Tenant 1', isolationLevel: 'DEDICATED' } };
    const role2: RuntimeRoleProfile = { roleId: 'user_2', roleName: 'User 2', tenantContext: { tenantId: 'tenant-2', tenantName: 'Tenant 2', isolationLevel: 'DEDICATED' } };
    const boundary: SessionIsolationBoundary = { boundaryId: 'bnd_1', enforceClearCookies: true, enforceClearLocalStorage: true, enforceClearSessionStorage: true, incognitoContext: true };

    const session1 = await runtime.launchIsolatedSession(role1, boundary);
    const session2 = await runtime.launchIsolatedSession(role2, boundary);

    const context1 = runtime.getPlaywrightContext(session1.sessionId);
    const context2 = runtime.getPlaywrightContext(session2.sessionId);

    // Assert absolute sequential browser context isolation
    expect(context1).not.toBe(context2);

    await runtime.terminateAll();

    // Verify all contexts are successfully destroyed and references cleared
    expect(runtime.activeSessions.get(session1.sessionId)!.status).toBe('TERMINATED');
    expect(runtime.activeSessions.get(session2.sessionId)!.status).toBe('TERMINATED');
    expect(() => runtime.getPlaywrightContext(session1.sessionId)).toThrow();
  });
});
