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

import { IExecutionGateway } from '../runtime/execution-gateway';
import { DefaultInvestigationContext } from './investigation-context';
import { InvestigationCandidateSynthesizer } from '../synthesis/investigation-candidate-synthesizer';
import { CandidatePrioritizationEngine } from '../scoring/candidate-prioritization-engine';
import { AttackGraphBuilder } from '../graphs/attack-graph-builder';
import { ConsistencyAnalyzer } from '../consistency/consistency-analyzer';
import { NoveltyAnalyzer } from '../novelty/novelty-analyzer';
import { SufficiencyAnalyzer } from '../sufficiency/sufficiency-analyzer';
import { ExplanationPlanner } from '../explanation/explanation-planner';

/**
 * @architecture_authority Intelligence Orchestration
 * @responsibility Coordinates the lifecycle of discovery, synthesis, and validation.
 * @allowed_dependencies Runtime Execution (via IExecutionGateway), Graph, Resource Analysis
 * @forbidden_dependencies Artifacts Serialization, Concrete Playwright Impls
 * @determinism Strict deterministic sequencing via ActionGraph and Zero Deletion synthesizer.
 */
export class InvestigationPipeline implements NetworkEvidenceHandler {
  private runtime: IExecutionGateway;
  private exchanges: CanonicalHttpExchange[] = [];
  private lineages: LineageExtractionResult[] = [];
  private ownershipRegistry = new EntityOwnershipRegistry();
  private activeContext?: DefaultInvestigationContext;
  
  constructor(private targetProfile: TargetSafetyProfile, private targetUrl: string) {
    this.runtime = new PlaywrightMultiSessionRuntime(targetProfile);
  }

  public async runDifferentialAnalysis(baseRole: RuntimeRoleProfile, compRole: RuntimeRoleProfile): Promise<InvestigationBundle> {
    const investigationId = `inv_${Date.now()}`;
    this.activeContext = new DefaultInvestigationContext(investigationId, this.targetUrl);
    
    console.log(`[Investigation ${investigationId}] Starting Differential Analysis: ${baseRole.roleName} vs ${compRole.roleName}`);

    // 1. Launch Sessions -> CREATED
    this.activeContext.transitionTo('CREATED');
    const baseSession = await this.runtime.launchIsolatedSession(baseRole, { boundaryId: 'b1', enforceClearCookies: true, enforceClearLocalStorage: true, enforceClearSessionStorage: true, incognitoContext: true });
    const compSession = await this.runtime.launchIsolatedSession(compRole, { boundaryId: 'b2', enforceClearCookies: true, enforceClearLocalStorage: true, enforceClearSessionStorage: true, incognitoContext: true });

    // 2. Attach Network Interceptors
    const baseInterceptor = new NetworkEvidenceInterceptor(this, baseSession.sessionId);
    const compInterceptor = new NetworkEvidenceInterceptor(this, compSession.sessionId);

    const baseCtx = this.runtime.getPlaywrightContext(baseSession.sessionId);
    const compCtx = this.runtime.getPlaywrightContext(compSession.sessionId);

    await baseInterceptor.attach(baseCtx);
    await compInterceptor.attach(compCtx);

    // 3. Execute Workflow via Crawler -> COLLECTING_EVIDENCE
    this.activeContext.transitionTo('COLLECTING_EVIDENCE');
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

    // 7. Live Perturbation Probing (Exploit Validation) -> AWAITING_VALIDATION
    this.activeContext.transitionTo('AWAITING_VALIDATION');
    const validationPipeline = new ReplayValidationPipeline();

    // 7a. Evidence-First Candidate Synthesis (Phase 12.6 Architectural Replacement)
    const extractor = new ResourceSignalExtractor();
    const inventory = extractor.extractInventory(this.exchanges);
    
    // 7b. Ownership Intelligence Activation (Phase 12.8)
    const ownershipInferencer = new OwnershipInferencer();
    const ownershipInventory = ownershipInferencer.inferOwnership(this.exchanges);
    
    const synthesizer = new ReplayCandidateSynthesizer();
    const semanticCandidates = synthesizer.synthesize(inventory, ownershipInventory, compSession.sessionId);

    this.activeContext.transitionTo('VALIDATING');
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
        },
        intelligenceTelemetry: {
          priorityMultiplier: cand.priorityMultiplier,
          ownershipRelationship: cand.ownershipRelationship,
          authorizationIntent: cand.authorizationIntent,
          synthesisReasons: cand.synthesisReasons
        }
      };

      const validated = await validationPipeline.validateFinding(eligibleCandidate, this.runtime);
      if (validated) {
         semanticFindings.push(validated);
         this.activeContext.attachValidation(validated.findingId || 'unknown');
      } else {
         const failedFinding = { ...pseudoFinding, isValidated: false } as ValidatedFinding;
         semanticFindings.push(failedFinding);
         this.activeContext.attachValidation(failedFinding.findingId || 'unknown');
      }
    }
    
    // 7c. Investigation Candidate Synthesis (Phase 12.16 & 12.16A)
    let stageSynthesisComplete = false;
    const candidateSynthesizer = new InvestigationCandidateSynthesizer();
    const synthesizedCandidates = candidateSynthesizer.synthesize(
        semanticFindings as ValidatedFinding[],
        baseRole.roleName,
        compRole.roleName,
        ownershipInventory
    );
    stageSynthesisComplete = true;
    
    // 7d. Investigation Candidate Scoring & Prioritization (Phase 12.17)
    if (!stageSynthesisComplete) throw new Error('Architectural Invariant Violation: Prioritization must never execute before Synthesis.');
    let stagePrioritizationComplete = false;
    const prioritizationEngine = new CandidatePrioritizationEngine();
    const prioritizedCandidates = prioritizationEngine.prioritize(synthesizedCandidates);
    this.activeContext.attachPrioritizedCandidates(prioritizedCandidates);
    stagePrioritizationComplete = true;
    
    // 7e. Investigation Attack Graph Construction (Phase 12.18)
    if (!stagePrioritizationComplete) throw new Error('Architectural Invariant Violation: Attack Graph Construction must never execute before Candidate Prioritization.');
    let stageGraphComplete = false;
    const graphBuilder = new AttackGraphBuilder();
    const attackGraph = graphBuilder.buildGraph(prioritizedCandidates);
    this.activeContext.attachAttackGraphs([attackGraph]);
    stageGraphComplete = true;
    
    // 7f. Contradiction & Consistency Analysis (Phase 12.19)
    if (!stageGraphComplete) throw new Error('Architectural Invariant Violation: Consistency Analysis must never execute before Attack Graph Construction.');
    let stageConsistencyComplete = false;
    const consistencyAnalyzer = new ConsistencyAnalyzer();
    const consistencyReport = consistencyAnalyzer.analyze(attackGraph, prioritizedCandidates);
    this.activeContext.attachConsistencyReports([consistencyReport]);
    stageConsistencyComplete = true;
    
    // 7g. Structural Novelty Detection (Phase 12.20)
    if (!stageConsistencyComplete) throw new Error('Architectural Invariant Violation: Structural Novelty Detection must never execute before Consistency Analysis.');
    let stageNoveltyComplete = false;
    const noveltyAnalyzer = new NoveltyAnalyzer();
    const noveltyReport = noveltyAnalyzer.analyze(attackGraph, consistencyReport);
    this.activeContext.attachNoveltyReports([noveltyReport]);
    stageNoveltyComplete = true;
    
    // 7h. Evidence Sufficiency Analysis (Phase 12.21)
    if (!stageNoveltyComplete) throw new Error('Architectural Invariant Violation: Evidence Sufficiency must never execute before Structural Novelty Detection.');
    let stageSufficiencyComplete = false;
    const sufficiencyAnalyzer = new SufficiencyAnalyzer();
    const sufficiencyReport = sufficiencyAnalyzer.analyze(
      this.activeContext.investigationId,
      prioritizedCandidates,
      [attackGraph],
      [consistencyReport]
    );
    this.activeContext.attachSufficiencyReports([sufficiencyReport]);
    stageSufficiencyComplete = true;
    
    // 7i. Investigation Explanation Planning (Phase 12.22)
    if (!stageSufficiencyComplete) throw new Error('Architectural Invariant Violation: Explanation Planning must never execute before Evidence Sufficiency.');
    const explanationPlanner = new ExplanationPlanner();
    const explanationPlan = explanationPlanner.plan(
      this.activeContext.investigationId,
      prioritizedCandidates,
      [attackGraph],
      [consistencyReport],
      [noveltyReport],
      [sufficiencyReport]
    );
    this.activeContext.attachExplanationPlans([explanationPlan]);

    console.log(`Synthesized, prioritized, graphed, evaluated consistency, detected novelty, verified sufficiency, and planned explanation sequence for ${prioritizedCandidates.length} deterministic investigation candidates.`);

    this.activeContext.transitionTo('COMPLETED');

    // 8. Bundle & Compress -> BUNDLED
    const compressor = new AiBundleCompressor();
    const bundle = compressor.compress(
      this.targetUrl, 
      this.activeContext,
      this.exchanges, 
      this.lineages, 
      undefined, 
      this.ownershipRegistry.exportAllLinks(),
      ownershipInventory
    );

    this.activeContext.transitionTo('BUNDLED');

    // 9. Cleanup
    await this.runtime.terminateAll();

    console.log(`Investigation Complete. Bundle generated deterministically.`);
    return bundle;
  }

  public getRuntime(): IExecutionGateway {
    return this.runtime;
  }

  // Implementation of NetworkEvidenceHandler
  public onExchangeCaptured(exchange: CanonicalHttpExchange, lineage: LineageExtractionResult): void {
    this.exchanges.push(exchange);
    this.lineages.push(lineage);
    this.ownershipRegistry.registerLineage(exchange.sessionId, lineage, exchange.exchangeId.id);
    if (this.activeContext) {
      this.activeContext.attachEvidence(exchange.exchangeId.id);
    }
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

