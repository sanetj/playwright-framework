import { PlaywrightMultiSessionRuntime } from '../../runtime/execution/playwright-multi-session';
import { TargetSafetyProfile } from '../perturbation/probe-safety';
import { NetworkEvidenceInterceptor, NetworkEvidenceHandler } from '../../runtime/instrumentation/network-evidence-interceptor';
import { CanonicalHttpExchange } from '../../runtime/evidence/canonical-http-evidence';
import { LineageExtractionResult } from '../../runtime/instrumentation/entity-lineage-extractor';
import { ActionGraph, GraphNode } from '../../graph/action-graph';

import { AiBundleCompressor, InvestigationBundle } from '../artifacts/ai-bundle-compressor';
import { RuntimeRoleProfile } from '../runtime/multi-session-runtime';
import { GovernedCrawlEngine } from '../../runtime/execution/governed-crawl-engine';
import { EntityOwnershipRegistry } from '../state/entity-ownership-registry';
import { LivePerturbationInterceptor } from '../../runtime/instrumentation/live-perturbation-interceptor';
import { ReplayValidationPipeline } from '../../runtime/validation/replay-validation-pipeline';
import { ValidatedFinding } from '../../runtime/validation/exploit-validation-engine';
import { ReplayEligibleCandidate } from '../../runtime/validation/replay-eligible-candidate';
import { OwnershipInferencer } from '../resource-analysis/ownership-inferencer';
import { ResourceSignalExtractor } from '../resource-analysis/resource-signal-extractor';
import { ReplayCandidateSynthesizer } from '../resource-analysis/replay-candidate-synthesizer';
import { DifferentialFinding } from '../differentials/differential-finding';

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

    // 5. Canonicalize Graphs (RETIRED - Phase 12.7)
    // const canonicalizer = new WorkflowCanonicalizer();

    // 6. Differential Analysis (RETIRED - Phase 12.7)
    // const engine = new ConcreteDifferentialEngine();

    // 7. Live Perturbation Probing (Exploit Validation)
    const validationPipeline = new ReplayValidationPipeline();

    // 7a. Evidence-First Candidate Synthesis (Phase 12.6 Architectural Replacement)
    const extractor = new ResourceSignalExtractor();
    const inventory = extractor.extractInventory(this.exchanges);
    const synthesizer = new ReplayCandidateSynthesizer();
    const semanticCandidates = synthesizer.synthesize(inventory);

    const semanticFindings: DifferentialFinding[] = [];

    for (const cand of semanticCandidates.candidates) {
      const baselineExchange = this.exchanges.find(e => e.exchangeId.id === cand.baselineExchangeId);
      if (!baselineExchange) continue;

      console.log(`Validating semantic candidate ${cand.candidateId} on ${baselineExchange.request.url}...`);

      const pseudoFinding: DifferentialFinding = {
        findingId: `sem_${cand.candidateId}`,
        type: cand.targetVector === 'IDOR' ? 'IDOR_CANDIDATE' : 'PRIVILEGE_ESCALATION_CANDIDATE',
        targetEntityId: `api:${cand.httpMethod}:${baselineExchange.request.url}`,
        targetRole: compRole.roleName,
        baseStatus: baselineExchange.response?.status || 200,
        comparisonStatus: 200, // Discovered at replay
        description: `Semantic Evidence Candidate: ${cand.synthesisReasons.join(', ')}`
      };

      const eligibleCandidate: ReplayEligibleCandidate = {
        finding: pseudoFinding,
        baselineExchange,
        comparisonProfile: compRole,
        sessionIsolationBoundary: { 
          boundaryId: 'replay_boundary', 
          enforceClearCookies: true, 
          enforceClearLocalStorage: true, 
          enforceClearSessionStorage: true, 
          incognitoContext: true 
        }
      };

      const validated = await validationPipeline.validateFinding(eligibleCandidate, this.runtime);
      if (validated) {
         semanticFindings.push(validated);
      } else {
         semanticFindings.push({ ...pseudoFinding, isValidated: false } as ValidatedFinding);
      }
    }
    // 7.5. Ownership Intelligence Activation (Phase 12.5)
    const ownershipInferencer = new OwnershipInferencer();
    const ownershipInventory = ownershipInferencer.inferOwnership(this.exchanges);

    // 8. Bundle & Compress
    const compressor = new AiBundleCompressor();
    const bundle = compressor.compress(
      this.targetUrl, 
      {
        baseRole: baseRole.roleId,
        baseRoleSessionId: baseSession.sessionId,
        comparisonRole: compRole.roleId,
        comparisonRoleSessionId: compSession.sessionId,
        findings: semanticFindings
      }, 
      this.exchanges, 
      this.lineages, 
      undefined, 
      this.ownershipRegistry.exportAllLinks(),
      ownershipInventory
    );

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

