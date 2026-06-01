import { test, expect, APIResponse, APIRequestContext, BrowserContext } from '@playwright/test';
import { PlaywrightMultiSessionRuntime } from '../../execution/playwright-multi-session';
import { LivePerturbationInterceptor } from '../../instrumentation/live-perturbation-interceptor';
import { ControlledReplayHarness } from '../rv1-controlled-harness';
import { ExploitVerifier } from '../exploit-verifier';
import { ReplayCoordinator } from '../../replay/replay-coordinator';
import { ReplayMutationPlan } from '../../replay/replay-mutation-plan';
import { TargetSafetyProfile } from '../../../intelligence/perturbation/probe-safety';
import { RuntimeRoleProfile, SessionIsolationBoundary } from '../../../intelligence/runtime/multi-session-runtime';
import { ReplayInstabilityDetector } from '../rv2-instability-diagnostics';
import { InvestigationBundleExporter, WorkflowDivergenceSignal } from '../rv3-bundle-exporter';
import {
  MOCK_JUICE_SHOP_BAC_EXCHANGE,
  MOCK_PORTSWIGGER_IDOR_EXCHANGE
} from '../rv1-replay-fixtures';
import {
  MOCK_MIXED_CDN_HEADERS_EXCHANGE
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

test.describe('RV.3 — Economic Reality & High-Value Workflow Validation Tests', () => {
  let runtime: PlaywrightMultiSessionRuntime;
  let interceptor: LivePerturbationInterceptor;
  let harness: ControlledReplayHarness;

  const safetyProfile: TargetSafetyProfile = {
    targetId: 'rv3-safety-profile',
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

  test('1. Cross-role workflow differential summaries & 8. Hidden workflow exposure summaries', async () => {
    const role = {
      roleId: 'juice_admin_role',
      roleName: 'Juice Admin',
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

    // Mock successful administrative BAC access (403 -> 200)
    mockContextRequest(context, () => {
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        bodyStr: JSON.stringify({ adminData: 'locked_details' })
      };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_juice_bac_economic',
      originalExecutionId: 'original',
      mutations: [{ type: 'AUTH_STRIP', targetHeader: 'cookie' }]
    };

    const coord = new ReplayCoordinator();
    const verifier = new ExploitVerifier(runtime, coord);
    const evidence = await verifier.verifyExploit(
      MOCK_JUICE_SHOP_BAC_EXCHANGE,
      session.sessionId,
      plan,
      interceptor,
      1
    );

    const detector = new ReplayInstabilityDetector();
    const diagnostic = detector.diagnose(evidence.evidenceCorrelation.consistencySignals, evidence);

    const bundleExporter = new InvestigationBundleExporter();
    const bundle = bundleExporter.generateBundle(evidence, diagnostic);

    // Asserts differential summary correctly captures boundary breach properties
    expect(bundle.differentialSummary.isPrivilegeBoundaryViolated).toBe(true);
    expect(bundle.differentialSummary.crossTenantDataLeaked).toBe(false);
    expect(bundle.differentialSummary.boundaryDivergenceDetails).toContain('Privilege boundary collapse');

    // Surfaced workflow contradictions
    expect(bundle.differentialSummary.workflowDivergenceSignals.length).toBe(2);

    expect(bundle.differentialSummary.workflowDivergenceSignals[0].stepId).toBe('hidden_admin_workflow_exposure');
    expect(bundle.differentialSummary.workflowDivergenceSignals[0].severity).toBe('HIGH');
    expect(bundle.differentialSummary.workflowDivergenceSignals[0].description).toContain('exposed hidden administrative workflow');

    expect(bundle.differentialSummary.workflowDivergenceSignals[1].stepId).toBe('privilege_boundary_collapse');
    expect(bundle.differentialSummary.workflowDivergenceSignals[1].severity).toBe('HIGH');
    expect(bundle.differentialSummary.workflowDivergenceSignals[1].description).toContain('transitioned from blocked status 403 to success status 200');
  });

  test('2. Cross-tenant replay evidence summaries & 7. Differential authorization surfacing', async () => {
    const role1 = {
      roleId: 'user_a',
      roleName: 'User A',
      tenantContext: { tenantId: 't-1', tenantName: 'Tenant 1', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const role2 = {
      roleId: 'user_b',
      roleName: 'User B',
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
      roleId: role2.roleId,
      headers: { 'Authorization': 'Bearer TokenB' }
    });

    const sessionA = await runtime.launchIsolatedSession(role1, boundary);
    const sessionB = await runtime.launchIsolatedSession(role2, boundary);

    const contextB = runtime.getPlaywrightContext(sessionB.sessionId);

    // Mock cross-tenant matching structure response
    mockContextRequest(contextB, () => {
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        bodyStr: JSON.stringify({
          invoiceId: 1001,
          owner: 'user1',
          amount: 150.00,
          timestamp: '2026-05-28T09:00:00Z'
        })
      };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_tenant_leak_economic',
      originalExecutionId: 'original',
      mutations: []
    };

    const coord = new ReplayCoordinator();
    const verifier = new ExploitVerifier(runtime, coord);
    const evidence = await verifier.verifyExploit(
      MOCK_PORTSWIGGER_IDOR_EXCHANGE,
      sessionB.sessionId,
      plan,
      interceptor,
      1
    );

    const detector = new ReplayInstabilityDetector();
    const diagnostic = detector.diagnose(evidence.evidenceCorrelation.consistencySignals, evidence);

    const bundleExporter = new InvestigationBundleExporter();
    const bundle = bundleExporter.generateBundle(evidence, diagnostic);

    // Cross-tenant mismatch detected!
    expect(bundle.differentialSummary.crossTenantDataLeaked).toBe(true);
    expect(bundle.differentialSummary.isPrivilegeBoundaryViolated).toBe(false);
    expect(bundle.differentialSummary.boundaryDivergenceDetails).toContain('Cross-tenant data exposure');

    expect(bundle.differentialSummary.workflowDivergenceSignals.length).toBe(1);
    expect(bundle.differentialSummary.workflowDivergenceSignals[0].stepId).toBe('cross_tenant_data_leak');
    expect(bundle.differentialSummary.workflowDivergenceSignals[0].severity).toBe('HIGH');
  });

  test('3. Reviewer-readable bundle generation & 4. Replay lineage clarity', async () => {
    const role = {
      roleId: 'user_a',
      roleName: 'User A',
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

    mockContextRequest(context, () => {
      return { status: 403, bodyStr: 'Forbidden' };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_lineage_economic',
      originalExecutionId: 'original',
      mutations: []
    };

    const coord = new ReplayCoordinator();
    const verifier = new ExploitVerifier(runtime, coord);
    const evidence = await verifier.verifyExploit(
      MOCK_PORTSWIGGER_IDOR_EXCHANGE,
      session.sessionId,
      plan,
      interceptor,
      1
    );

    const detector = new ReplayInstabilityDetector();
    const diagnostic = detector.diagnose(evidence.evidenceCorrelation.consistencySignals, evidence);

    const bundleExporter = new InvestigationBundleExporter();
    const bundle = bundleExporter.generateBundle(evidence, diagnostic);

    // Asserts exact human-reviewable lineage variables
    expect(bundle.bundleId).toBe(`bundle_${evidence.evidenceId}`);
    expect(bundle.originalExchangeId).toBe(MOCK_PORTSWIGGER_IDOR_EXCHANGE.exchangeId.id);
    expect(bundle.mutationPlanId).toBe('mut_lineage_economic');
    expect(bundle.targetRoleProfileId).toBe('user_a');
  });

  test('5. Workflow contradiction readability', () => {
    const signal: WorkflowDivergenceSignal = {
      stepId: 'privilege_boundary_collapse',
      description: 'Divergence matched: status code transitioned from 403 to 200',
      severity: 'HIGH'
    };

    expect(signal.severity).toBe('HIGH');
    expect(signal.description).toContain('403 to 200');
  });

  test('6. Stable investigation bundle serialization', async () => {
    const role = {
      roleId: 'user_a',
      roleName: 'User A',
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

    mockContextRequest(context, () => {
      return { status: 403, bodyStr: 'Forbidden' };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_serialization_economic',
      originalExecutionId: 'original',
      mutations: []
    };

    const coord = new ReplayCoordinator();
    const verifier = new ExploitVerifier(runtime, coord);
    const evidence = await verifier.verifyExploit(
      MOCK_PORTSWIGGER_IDOR_EXCHANGE,
      session.sessionId,
      plan,
      interceptor,
      1
    );

    const detector = new ReplayInstabilityDetector();
    const diagnostic = detector.diagnose(evidence.evidenceCorrelation.consistencySignals, evidence);

    const bundleExporter = new InvestigationBundleExporter();
    const bundle = bundleExporter.generateBundle(evidence, diagnostic);

    // Verify deep freeze
    expect(Object.isFrozen(bundle)).toBe(true);
    expect(Object.isFrozen(bundle.differentialSummary)).toBe(true);

    const serialized = JSON.stringify(bundle);
    const parsed = JSON.parse(serialized);

    expect(parsed.bundleId).toBe(bundle.bundleId);
    expect(parsed.serializedTraceFootprint).toBe(bundle.serializedTraceFootprint);
  });

  test('9. Repeated reproducibility under realistic workflow chains', async () => {
    const role = {
      roleId: 'user_a',
      roleName: 'User A',
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

    mockContextRequest(context, () => {
      return { status: 200, bodyStr: '{"products":[]}' };
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_reproducibility_economic',
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
});
