import { PlaywrightMultiSessionRuntime } from '../../runtime/execution/playwright-multi-session';
import { TargetSafetyProfile } from '../perturbation/probe-safety';
import { NetworkEvidenceInterceptor, NetworkEvidenceHandler } from '../../runtime/instrumentation/network-evidence-interceptor';
import { CanonicalHttpExchange } from '../../runtime/evidence/canonical-http-evidence';
import { LineageExtractionResult } from '../../runtime/instrumentation/entity-lineage-extractor';
import { ActionGraph, GraphNode } from '../../graph/action-graph';
import { WorkflowCanonicalizer } from '../workflows/workflow-canonicalizer';
import { ConcreteDifferentialEngine, DifferentialComparisonResult } from '../differentials/concrete-differential-engine';
import { AiBundleCompressor, InvestigationBundle } from '../artifacts/ai-bundle-compressor';
import { RuntimeRoleProfile } from '../runtime/multi-session-runtime';
import { GovernedCrawlEngine } from '../../runtime/execution/governed-crawl-engine';
import { EntityOwnershipRegistry } from '../state/entity-ownership-registry';
import { LivePerturbationInterceptor } from '../../runtime/instrumentation/live-perturbation-interceptor';
import { ReplayValidationPipeline } from '../../runtime/validation/replay-validation-pipeline';
import { ValidatedFinding } from '../../runtime/validation/exploit-validation-engine';

export class InvestigationPipeline implements NetworkEvidenceHandler {
  private runtime: PlaywrightMultiSessionRuntime;
  private exchanges: CanonicalHttpExchange[] = [];
  private lineages: LineageExtractionResult[] = [];
  private ownershipRegistry = new EntityOwnershipRegistry();
  
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

    // 3. Execute Workflow via Crawler
    const baseCrawler = new GovernedCrawlEngine();
    
    console.log(`Crawling target as ${baseRole.roleName}...`);
    await baseCrawler.crawl(baseCtx, this.targetUrl);
    
    const compCrawler = new GovernedCrawlEngine();
    console.log(`Crawling target as ${compRole.roleName}...`);
    await compCrawler.crawl(compCtx, this.targetUrl);

    // 4. Build Graphs
    const baseGraph = this.buildGraphFromExchanges(baseSession.sessionId);
    const compGraph = this.buildGraphFromExchanges(compSession.sessionId);

    // 5. Canonicalize Graphs
    const canonicalizer = new WorkflowCanonicalizer();
    const canonBase = canonicalizer.canonicalize(baseGraph);
    const canonComp = canonicalizer.canonicalize(compGraph);

    // 6. Differential Analysis (Response Aware)
    const engine = new ConcreteDifferentialEngine();
    const diffResult = engine.compare(canonBase, canonComp, baseRole.roleId, compRole.roleId);

    // 7. Live Perturbation Probing (Exploit Validation)
    const validationPipeline = new ReplayValidationPipeline();
    const validatedFindings: ValidatedFinding[] = [];

    for (const finding of diffResult.findings) {
      // Find the base exchange that caused this finding
      // For simplicity, we just pick the first base exchange with the same URL
      const originalExchange = this.exchanges.find(e => e.sessionId === baseSession.sessionId && e.request.url.includes(finding.targetEntityId || ''));
      
      if (originalExchange) {
         console.log(`Validating finding on ${finding.targetEntityId}...`);
         const validated = await validationPipeline.validateFinding(finding, this.runtime, originalExchange);
         if (validated) {
            validatedFindings.push(validated);
         }
      }
    }
    
    // Replace findings with validated findings in the diff result
    if (validatedFindings.length > 0) {
       diffResult.findings = validatedFindings;
    }

    // 8. Bundle & Compress
    const compressor = new AiBundleCompressor();
    const bundle = compressor.compress(this.targetUrl, diffResult, this.exchanges, this.lineages);

    // 9. Cleanup
    await this.runtime.terminateAll();

    console.log(`Investigation Complete. Found ${bundle.differentialAnalysis.findings.length} findings.`);
    return bundle;
  }

  public getRuntime(): PlaywrightMultiSessionRuntime {
    return this.runtime;
  }

  // Implementation of NetworkEvidenceHandler
  public onExchangeCaptured(exchange: CanonicalHttpExchange, lineage: LineageExtractionResult): void {
    this.exchanges.push(exchange);
    this.lineages.push(lineage);
    this.ownershipRegistry.registerLineage(exchange.sessionId, lineage, exchange.exchangeId.id);
  }

  private buildGraphFromExchanges(sessionId: string): ActionGraph {
    const graph = new ActionGraph();
    const sessionExchanges = this.exchanges.filter(ex => ex.sessionId === sessionId);
    
    console.log(`Building graph for session ${sessionId}, found ${sessionExchanges.length} exchanges.`);
    for (const ex of sessionExchanges) {
      const apiNodeId = `api:${ex.request.method}:${ex.request.url}`;
      console.log(`Added node: ${apiNodeId} with status ${ex.response?.status}`);
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

