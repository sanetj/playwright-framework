import { test, expect, APIResponse, APIRequestContext, BrowserContext } from '@playwright/test';
import { PlaywrightMultiSessionRuntime } from '../../execution/playwright-multi-session';
import { ReplayCoordinator } from '../../replay/replay-coordinator';
import { LivePerturbationInterceptor } from '../../instrumentation/live-perturbation-interceptor';
import { ExploitVerifier, ExploitEvidence } from '../exploit-verifier';
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
import { OWASP_JUICE_SHOP_LAB, PORTSWIGGER_LAB } from '../rv1-lab-fixtures';

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

test.describe('RV.1A — Reality Validation Harness (Phase RV.1)', () => {
  let runtime: PlaywrightMultiSessionRuntime;
  let interceptor: LivePerturbationInterceptor;

  const safetyProfile: TargetSafetyProfile = {
    targetId: 'rv1-safety-profile',
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

  test.describe('A) Replay Stability Invariants', () => {
    test('1. Identical consecutive replays remain byte-identical with zero drift', async () => {
      const role = {
        roleId: OWASP_JUICE_SHOP_LAB.roleProfiles[0].roleId,
        roleName: OWASP_JUICE_SHOP_LAB.roleProfiles[0].roleName,
        tenantContext: { tenantId: 't-1', tenantName: 'Tenant 1', isolationLevel: 'DEDICATED' }
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

      // Simulate a stable BAC exploitation behavior (originally 403, collapses to 200)
      mockContextRequest(context, (url) => {
        if (url.includes('/api/administration')) {
          return {
            status: 200,
            headers: { 'content-type': 'application/json', 'x-custom': 'stable-value' },
            bodyStr: JSON.stringify({ status: 'success', data: { adminPanel: 'unlocked' } })
          };
        }
        return { status: 404, bodyStr: 'Not found' };
      });

      const plan: ReplayMutationPlan = {
        planId: 'mut_juice_bac',
        originalExecutionId: 'original',
        mutations: [
          { type: 'AUTH_STRIP', targetHeader: 'cookie' }
        ]
      };

      // Perform verification execution 1 with fresh verifier & coordinator
      const coord1 = new ReplayCoordinator();
      const ver1 = new ExploitVerifier(runtime, coord1);
      const evidence1 = await ver1.verifyExploit(
        MOCK_JUICE_SHOP_BAC_EXCHANGE,
        session.sessionId,
        plan,
        interceptor,
        3
      );

      // Perform verification execution 2 with fresh verifier & coordinator
      const coord2 = new ReplayCoordinator();
      const ver2 = new ExploitVerifier(runtime, coord2);
      const evidence2 = await ver2.verifyExploit(
        MOCK_JUICE_SHOP_BAC_EXCHANGE,
        session.sessionId,
        plan,
        interceptor,
        3
      );

      // Assert zero drift detected across identical executions
      expect(evidence1.evidenceCorrelation.replayDriftDetected).toBe(false);
      expect(evidence2.evidenceCorrelation.replayDriftDetected).toBe(false);

      // Assert identical outcome classification and confidence
      expect(evidence1.evidenceCorrelation.derivedConfidence).toBe('VERIFIED');
      expect(evidence2.evidenceCorrelation.derivedConfidence).toBe('VERIFIED');
      expect(evidence1.evidenceCorrelation.replayOutcomeClassification).toBe('STABLE_VERIFIED');
      expect(evidence2.evidenceCorrelation.replayOutcomeClassification).toBe('STABLE_VERIFIED');

      // Assert lexicographically sorted confidence factors match
      expect(evidence1.evidenceCorrelation.confidenceFactors).toEqual(evidence2.evidenceCorrelation.confidenceFactors);

      // Verify serialized representations are 100% byte-identical
      const serialized1 = JSON.stringify(evidence1);
      const serialized2 = JSON.stringify(evidence2);
      expect(serialized1).toBe(serialized2);
    });
  });

  test.describe('B) Mutation Correctness & Session Isolation', () => {
    test('1. Role credential rewrites are isolated correctly across separate target contexts', async () => {
      const role1 = {
        roleId: PORTSWIGGER_LAB.roleProfiles[0].roleId,
        roleName: PORTSWIGGER_LAB.roleProfiles[0].roleName,
        tenantContext: { tenantId: 't-ps-1', tenantName: 'PortSwigger Tenant 1', isolationLevel: 'DEDICATED' }
      } as RuntimeRoleProfile;

      const role2 = {
        roleId: PORTSWIGGER_LAB.roleProfiles[1].roleId,
        roleName: PORTSWIGGER_LAB.roleProfiles[1].roleName,
        tenantContext: { tenantId: 't-ps-2', tenantName: 'PortSwigger Tenant 2', isolationLevel: 'DEDICATED' }
      } as RuntimeRoleProfile;

      const boundary = {
        boundaryId: 'bnd_ps',
        enforceClearCookies: true,
        enforceClearLocalStorage: true,
        enforceClearSessionStorage: true,
        incognitoContext: true
      } as SessionIsolationBoundary;

      // Populate separate credentials in the multi-session vault
      runtime.getCredentialVault().storeCredentials({
        roleId: role1.roleId,
        headers: { 'Authorization': 'Bearer token-user1' }
      });
      runtime.getCredentialVault().storeCredentials({
        roleId: role2.roleId,
        headers: { 'Authorization': 'Bearer token-user2' }
      });

      const session1 = await runtime.launchIsolatedSession(role1, boundary);
      const session2 = await runtime.launchIsolatedSession(role2, boundary);

      const context1 = runtime.getPlaywrightContext(session1.sessionId);
      const context2 = runtime.getPlaywrightContext(session2.sessionId);

      // Mock context requests capturing request headers
      let capturedHeader1 = '';
      mockContextRequest(context1, (url, options) => {
        const headers = (options as Record<string, unknown>)?.headers as Record<string, string> || {};
        capturedHeader1 = headers['authorization'] || '';
        return { status: 200, bodyStr: '{"ok": true}' };
      });

      let capturedHeader2 = '';
      mockContextRequest(context2, (url, options) => {
        const headers = (options as Record<string, unknown>)?.headers as Record<string, string> || {};
        capturedHeader2 = headers['authorization'] || '';
        return { status: 200, bodyStr: '{"ok": true}' };
      });

      const plan: ReplayMutationPlan = {
        planId: 'mut_ps_idor',
        originalExecutionId: 'original',
        mutations: [
          { type: 'IDOR_INJECT', targetParam: 'query', injectedValue: '1002' }
        ]
      };

      // Verify exploit under Session 1 (fresh verifier)
      const coord1 = new ReplayCoordinator();
      const ver1 = new ExploitVerifier(runtime, coord1);
      await ver1.verifyExploit(
        MOCK_PORTSWIGGER_IDOR_EXCHANGE,
        session1.sessionId,
        plan,
        interceptor,
        1
      );

      // Verify exploit under Session 2 (fresh verifier)
      const coord2 = new ReplayCoordinator();
      const ver2 = new ExploitVerifier(runtime, coord2);
      await ver2.verifyExploit(
        MOCK_PORTSWIGGER_IDOR_EXCHANGE,
        session2.sessionId,
        plan,
        interceptor,
        1
      );

      // Ensure credential mapping mapped accurately and kept perfectly isolated
      expect(capturedHeader1).toBe('Bearer token-user1');
      expect(capturedHeader2).toBe('Bearer token-user2');
    });
  });

  test.describe('C) False Positive Resistance', () => {
    test('1. CSRF validation rejections are correctly classified with no false BAC alerts', async () => {
      const role = {
        roleId: OWASP_JUICE_SHOP_LAB.roleProfiles[1].roleId,
        roleName: OWASP_JUICE_SHOP_LAB.roleProfiles[1].roleName,
        tenantContext: { tenantId: 't-2', tenantName: 'Tenant 2', isolationLevel: 'DEDICATED' }
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

      // Mock context returns a explicit CSRF error
      mockContextRequest(context, () => {
        return {
          status: 403,
          headers: { 'content-type': 'application/json' },
          bodyStr: JSON.stringify({ error: 'CSRF token verification failed' })
        };
      });

      const plan: ReplayMutationPlan = {
        planId: 'mut_csrf_fail',
        originalExecutionId: 'original',
        mutations: []
      };

      const coord = new ReplayCoordinator();
      const ver = new ExploitVerifier(runtime, coord);
      const evidence = await ver.verifyExploit(
        MOCK_CSRF_REJECTION_EXCHANGE,
        session.sessionId,
        plan,
        interceptor,
        1
      );

      // CSRF block must not trigger successful exploit evidence, and must have proper rejection signals
      expect(evidence.structuralVerificationOutcome.isExploited).toBe(false);
      expect(evidence.rejectionSignal).toBeDefined();
      expect(evidence.rejectionSignal!.category).toBe('CSRF_REJECTED');
      expect(evidence.rejectionSignal!.statusCode).toBe(403);
      expect(evidence.rejectionSignal!.deterministicReason).toContain('CSRF rejection detected');
    });

    test('2. Dynamic logins / authorization redirects are normalized and categorized stably', async () => {
      const role = {
        roleId: OWASP_JUICE_SHOP_LAB.roleProfiles[2].roleId,
        roleName: OWASP_JUICE_SHOP_LAB.roleProfiles[2].roleName,
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

      // Mock dynamic redirect location with varying timestamps and nonces
      mockContextRequest(context, () => {
        return {
          status: 302,
          headers: { 'location': '/login?ts=1716900400&nonce=xyz789&redir=/api/users' },
          bodyStr: 'Redirecting...'
        };
      });

      const plan: ReplayMutationPlan = {
        planId: 'mut_auth_redirect',
        originalExecutionId: 'original',
        mutations: []
      };

      const coord = new ReplayCoordinator();
      const ver = new ExploitVerifier(runtime, coord);
      const evidence = await ver.verifyExploit(
        MOCK_AUTH_REDIRECT_EXCHANGE,
        session.sessionId,
        plan,
        interceptor,
        1
      );

      expect(evidence.structuralVerificationOutcome.isExploited).toBe(false);
      expect(evidence.rejectionSignal).toBeDefined();
      expect(evidence.rejectionSignal!.category).toBe('REDIRECTED');
      expect(evidence.rejectionSignal!.statusCode).toBe(302);
      expect(evidence.rejectionSignal!.redirectDetected).toBe(true);

      // Verify the location was stably normalized, query keys sorted, and nonces stripped!
      expect(evidence.rejectionSignal!.normalizedLocation).toBe('/login?redir=%2Fapi%2Fusers');
    });
  });

  test.describe('D) Evidence Integrity Invariants', () => {
    test('1. Generated evidence is deep frozen and strictly serializable with zero dynamic generators', async () => {
      const role = {
        roleId: OWASP_JUICE_SHOP_LAB.roleProfiles[1].roleId,
        roleName: OWASP_JUICE_SHOP_LAB.roleProfiles[1].roleName,
        tenantContext: { tenantId: 't-2', tenantName: 'Tenant 2', isolationLevel: 'DEDICATED' }
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
        return { status: 403, bodyStr: 'Forbidden' };
      });

      const plan: ReplayMutationPlan = {
        planId: 'mut_evidence_integrity',
        originalExecutionId: 'original',
        mutations: []
      };

      const coord = new ReplayCoordinator();
      const ver = new ExploitVerifier(runtime, coord);
      const evidence = await ver.verifyExploit(
        MOCK_JUICE_SHOP_BAC_EXCHANGE,
        session.sessionId,
        plan,
        interceptor,
        1
      );

      // Assert immutable contract
      expect(Object.isFrozen(evidence)).toBe(true);
      expect(Object.isFrozen(evidence.evidenceCorrelation)).toBe(true);
      expect(Object.isFrozen(evidence.replayedExchange)).toBe(true);

      // Assert strict serializability
      const serialized = JSON.stringify(evidence);
      const deserialized = JSON.parse(serialized) as ExploitEvidence;

      expect(deserialized.evidenceId).toBe(evidence.evidenceId);
      expect(deserialized.statusCodeComparison.replayedStatus).toBe(evidence.statusCodeComparison.replayedStatus);

      // Ensure absolutely zero dynamic generators like Date.now() / Math.random() / randomUUID()
      // occurred inside the verifier or generated metadata fields.
      // Dates/timestamps are strictly derived from base lineage.
      expect(evidence.deterministicReplayMetadata.timestamp).toBe(MOCK_JUICE_SHOP_BAC_EXCHANGE.timestamp + 2000);
      expect(evidence.replayedExchange.timestamp).toBe(MOCK_JUICE_SHOP_BAC_EXCHANGE.timestamp + 1000);

      // Verify safe static prefixes for UUID preservation
      expect(evidence.evidenceId).toBe(`evidence_${MOCK_JUICE_SHOP_BAC_EXCHANGE.exchangeId.id}_${session.roleProfile.roleId}`);
      expect(evidence.deterministicReplayMetadata.replayExecutionId).toContain('rep_exec_');
      expect(evidence.deterministicReplayMetadata.replayIsolationSignature).toBe(`iso_${MOCK_JUICE_SHOP_BAC_EXCHANGE.sessionId}_to_${session.roleProfile.roleId}`);
      expect(evidence.deterministicReplayMetadata.credentialBoundarySignature).toContain('bnd_');
      expect(evidence.deterministicReplayMetadata.mutationFingerprint).toBe('mut_fp_none');
      expect(evidence.deterministicReplayMetadata.replayLineageReference).toBe(`ref_${MOCK_JUICE_SHOP_BAC_EXCHANGE.exchangeId.id}`);
    });
  });
});
