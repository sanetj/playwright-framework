import { PlaywrightMultiSessionRuntime } from '../../runtime/execution/playwright-multi-session';
import { TargetSafetyProfile } from '../perturbation/probe-safety';
import { NetworkEvidenceInterceptor, NetworkEvidenceHandler } from '../../runtime/instrumentation/network-evidence-interceptor';
import { CanonicalHttpExchange } from '../../runtime/evidence/canonical-http-evidence';
import { LineageExtractionResult } from '../../runtime/instrumentation/entity-lineage-extractor';
import { ActionGraph, GraphNode } from '../graph/action-graph';
import { WorkflowCanonicalizer } from '../workflows/workflow-canonicalizer';
import { ConcreteDifferentialEngine, DifferentialComparisonResult } from '../differentials/concrete-differential-engine';
import { AiBundleCompressor, InvestigationBundle } from '../artifacts/ai-bundle-compressor';
import { RuntimeRoleProfile } from '../runtime/multi-session-runtime';

export class InvestigationPipeline implements NetworkEvidenceHandler {
  private runtime: PlaywrightMultiSessionRuntime;
  private exchanges: CanonicalHttpExchange[] = [];
  private lineages: LineageExtractionResult[] = [];
  
  // Temporary storage for building ActionGraphs from captured exchanges
  private capturedNodesBase = new Map<string, GraphNode>();
  private capturedNodesComp = new Map<string, GraphNode>();

  constructor(private targetProfile: TargetSafetyProfile, private targetUrl: string) {
    this.runtime = new PlaywrightMultiSessionRuntime(targetProfile);
  }

  public async runDifferentialAnalysis(baseRole: RuntimeRoleProfile, compRole: RuntimeRoleProfile): Promise<InvestigationBundle> {
    console.log(`Starting Differential Investigation: ${baseRole.roleName} vs ${compRole.roleName}`);

    // 1. Launch Sessions
    const baseSession = await this.runtime.launchIsolatedSession(baseRole, { boundaryId: 'b1', enforceClearCookies: true, enforceClearLocalStorage: true, enforceClearSessionStorage: true, incognitoContext: true });
    const compSession = await this.runtime.launchIsolatedSession(compRole, { boundaryId: 'b2', enforceClearCookies: true, enforceClearLocalStorage: true, enforceClearSessionStorage: true, incognitoContext: true });

    // 2. Attach Network Interceptors
    const baseInterceptor = new NetworkEvidenceInterceptor(this, baseSession.sessionId);
    const compInterceptor = new NetworkEvidenceInterceptor(this, compSession.sessionId);

    const baseCtx = this.runtime.getPlaywrightContext(baseSession.sessionId);
    const compCtx = this.runtime.getPlaywrightContext(compSession.sessionId);

    await baseInterceptor.attach(baseCtx);
    await compInterceptor.attach(compCtx);

    // 3. Execute Workflow (Simulated here. In reality, a playwright script would drive the page)
    const basePage = await baseCtx.newPage();
    const compPage = await compCtx.newPage();

    console.log(`Navigating both roles to ${this.targetUrl}...`);
    await Promise.all([
      basePage.goto(this.targetUrl),
      compPage.goto(this.targetUrl)
    ]);

    // Explicitly trigger the fetches in the page context and wait for them to finish
    const runFetches = async () => {
      await fetch('/api/user/me');
      await fetch('/api/admin/settings');
    };

    await Promise.all([
      basePage.evaluate(runFetches),
      compPage.evaluate(runFetches)
    ]);
    const baseGraph = this.buildGraphFromExchanges(baseSession.sessionId);
    const compGraph = this.buildGraphFromExchanges(compSession.sessionId);

    // 5. Canonicalize Graphs
    const canonicalizer = new WorkflowCanonicalizer();
    const canonBase = canonicalizer.canonicalize(baseGraph);
    const canonComp = canonicalizer.canonicalize(compGraph);

    // 6. Differential Analysis
    const engine = new ConcreteDifferentialEngine();
    const diffResult = engine.compare(canonBase, canonComp, baseRole.roleId, compRole.roleId);

    // 7. Bundle & Compress
    const compressor = new AiBundleCompressor();
    const bundle = compressor.compress(this.targetUrl, diffResult, this.exchanges, this.lineages);

    // 8. Cleanup
    await this.runtime.terminateAll();

    console.log(`Investigation Complete. Found ${bundle.differentialAnalysis.findings.length} findings.`);
    return bundle;
  }

  // Implementation of NetworkEvidenceHandler
  public onExchangeCaptured(exchange: CanonicalHttpExchange, lineage: LineageExtractionResult): void {
    this.exchanges.push(exchange);
    this.lineages.push(lineage);
  }

  private buildGraphFromExchanges(sessionId: string): ActionGraph {
    const graph = new ActionGraph();
    const sessionExchanges = this.exchanges.filter(ex => ex.sessionId === sessionId);
    
    for (const ex of sessionExchanges) {
      const apiNodeId = `api:${ex.request.method}:${ex.request.url}`;
      graph.addNode({
        id: apiNodeId,
        layer: 'structural',
        kind: 'api',
        label: apiNodeId,
        attrs: { status: ex.response?.status }
      });
    }
    return graph;
  }
}
