import { PlaywrightMultiSessionRuntime } from '../execution/playwright-multi-session';
import { LivePerturbationInterceptor } from '../instrumentation/live-perturbation-interceptor';
import { ExploitVerifier, ExploitEvidence } from './exploit-verifier';
import { ReplayCoordinator } from '../replay/replay-coordinator';
import { ReplayMutationPlan } from '../replay/replay-mutation-plan';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';
import { ReplayInstabilityDetector } from './rv2-instability-diagnostics';
import { HumanReadableEvidenceExporter, HumanReadableEvidenceSummary } from './rv2-evidence-exporter';
import { InvestigationBundleExporter, InvestigationBundle } from './rv3-bundle-exporter';
import { SessionIsolationBoundary, RuntimeRoleProfile } from '../../intelligence/runtime/multi-session-runtime';

export interface JuiceShopWorkflowValidationResult {
  readonly workflowName: string;
  readonly targetRole: string;
  readonly isVulnerable: boolean;
  readonly summary: HumanReadableEvidenceSummary;
  readonly bundle: InvestigationBundle;
}

export class JuiceShopOperationalValidator {
  private readonly detector = new ReplayInstabilityDetector();
  private readonly summaryExporter = new HumanReadableEvidenceExporter();
  private readonly bundleExporter = new InvestigationBundleExporter();

  constructor(
    private readonly runtime: PlaywrightMultiSessionRuntime,
    private readonly interceptor: LivePerturbationInterceptor
  ) {}

  /**
   * Safe, sequential workflow validation execution against Juice Shop capture models.
   */
  public async validateWorkflow(
    workflowName: string,
    exchange: CanonicalHttpExchange,
    targetRole: RuntimeRoleProfile,
    boundary: SessionIsolationBoundary,
    plan: ReplayMutationPlan,
    mockHandler: (url: string, options?: unknown) => { status: number; headers?: Record<string, string>; bodyStr: string }
  ): Promise<JuiceShopWorkflowValidationResult> {
    
    // 1. Isolated Session Setup
    const session = await this.runtime.launchIsolatedSession(targetRole, boundary);
    const context = this.runtime.getPlaywrightContext(session.sessionId);

    // Attach mock API Request handler safely
    Object.defineProperty(context, 'request', {
      value: {
        tracing: {
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
        },
        fetch: async (url: string, options?: unknown) => {
          const res = mockHandler(url, options);
          return {
            status: () => res.status,
            headers: () => res.headers || {},
            headersArray: () => Object.entries(res.headers || {}).map(([name, value]) => ({ name, value })),
            body: async () => Buffer.from(res.bodyStr, 'utf-8'),
            text: async () => res.bodyStr,
            json: async () => JSON.parse(res.bodyStr),
            ok: () => res.status >= 200 && res.status < 300,
            statusText: () => 'OK',
            url: () => url,
            dispose: async () => {},
            [Symbol.asyncDispose]: async () => {}
          };
        },
        get: async (url: string, options?: unknown) => {
          const res = mockHandler(url, { ...(options as Record<string, unknown>), method: 'GET' });
          return {
            status: () => res.status,
            headers: () => res.headers || {},
            headersArray: () => Object.entries(res.headers || {}).map(([name, value]) => ({ name, value })),
            body: async () => Buffer.from(res.bodyStr, 'utf-8'),
            text: async () => res.bodyStr,
            json: async () => JSON.parse(res.bodyStr),
            ok: () => res.status >= 200 && res.status < 300,
            statusText: () => 'OK',
            url: () => url,
            dispose: async () => {},
            [Symbol.asyncDispose]: async () => {}
          };
        },
        storageState: async () => ({ cookies: [], origins: [] }),
        dispose: async () => {},
        [Symbol.asyncDispose]: async () => {}
      },
      configurable: true,
      writable: true
    });

    // 2. Controlled Replay Execution (Sequential Coordinator)
    const coord = new ReplayCoordinator();
    const verifier = new ExploitVerifier(this.runtime, coord);
    
    const evidence = await verifier.verifyExploit(
      exchange,
      session.sessionId,
      plan,
      this.interceptor,
      2
    );

    // 3. Diagnostics & Exporters
    const diagnostic = this.detector.diagnose(evidence.evidenceCorrelation.consistencySignals, evidence);
    const summary = this.summaryExporter.exportHumanSummary(evidence, diagnostic);
    const bundle = this.bundleExporter.generateBundle(evidence, diagnostic);

    const isVulnerable = evidence.structuralVerificationOutcome.isExploited;

    // Clean up isolated context
    await this.runtime.terminateSession(session.sessionId);

    const result: JuiceShopWorkflowValidationResult = {
      workflowName,
      targetRole: targetRole.roleId,
      isVulnerable,
      summary,
      bundle
    };

    return Object.freeze(result);
  }
}
