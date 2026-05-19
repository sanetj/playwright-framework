#!/usr/bin/env node
import path from 'node:path';
import { IntelligentCrawler } from '../core/crawler/intelligent.crawler';
import { SecurityContextGenerator } from '../core/security/security.context.generator';
import { RiskScorer } from '../core/scoring/risk.scorer';
import { AIExporter } from '../core/export/ai.exporter';
import { PluginManager } from '../core/plugins/plugin.manager';
import { jwtAnalyzerPlugin } from '../core/plugins/jwt-analyzer.plugin';
import { AppContextDossier } from '../models/schema';
import { NormalizedEventBus } from '../core/intelligence/normalized-event-bus';
import { ActionGraph } from '../core/intelligence/action-graph';
import { WorkflowEngine } from '../core/intelligence/workflow-engine';
import { SemanticApiAnalyzer } from '../core/intelligence/semantic-api-analyzer';
import { TrustBoundaryEngine } from '../core/intelligence/trust-boundary-engine';
import { RuntimeSecurityDetectors } from '../core/intelligence/runtime-security-detectors';
import { AIContextCompressor } from '../core/intelligence/ai-context-compressor';

async function main(): Promise<void> {
  const target = process.argv[2];
  if (!target) throw new Error('Usage: intel <url> [out-dir]');

  const output = process.argv[3] ?? path.join(process.cwd(), 'artifacts', 'intel');
  const crawler = new IntelligentCrawler();
  const securityGenerator = new SecurityContextGenerator();
  const pluginManager = new PluginManager();
  pluginManager.register(jwtAnalyzerPlugin);

  const { routes, workflows, network } = await crawler.crawl(target);
  const endpoints = network.getEndpoints();

  const eventBus = new NormalizedEventBus();
  for (const r of routes) {
    eventBus.publish({ type: 'navigation', source: 'playwright', ctx: { pageUrl: r.url }, data: { to: r.url, title: r.title, depth: r.depth } });
  }
  for (const w of workflows) {
    eventBus.publish({ type: 'ui.action', source: 'playwright', ctx: { pageUrl: w.routeId, actionId: w.id }, data: { action: w.action, transitionTo: w.transitionTo } });
    if (w.action.includes('storage_write')) {
      eventBus.publish({ type: 'storage', source: 'runtime', ctx: { pageUrl: w.routeId, actionId: w.id }, data: { key: w.action } });
    }
  }
  for (const e of endpoints) {
    eventBus.publish({ type: 'network.request', source: 'network', ctx: { pageUrl: target }, data: { method: e.method, url: e.url } });
    eventBus.publish({ type: 'network.response', source: 'network', ctx: { pageUrl: target }, data: { statusCodes: e.statusCodes, contentTypes: e.contentTypes } });
  }

  const timeline = eventBus.getTimeline();
  const graph = new ActionGraph();
  graph.ingest(timeline.events);

  const workflowModels = new WorkflowEngine().infer(timeline.events, graph);
  const semanticApis = new SemanticApiAnalyzer().analyze(endpoints);
  const trustReport = new TrustBoundaryEngine().analyze(endpoints, semanticApis, network.getAuthSignals());
  const runtimeFindings = new RuntimeSecurityDetectors().detect(timeline.events);

  const findings = securityGenerator
    .generateFindings(endpoints, workflows)
    .concat(runtimeFindings)
    .concat(trustReport.findings);

  const dossier: AppContextDossier = {
    target,
    generatedAt: new Date().toISOString(),
    architectureSummary: 'Behavioral intelligence run completed with semantic workflow, API, and trust-boundary inference.',
    technologies: ['Playwright-observed', 'Semantic-intelligence-layer'],
    routes,
    endpoints,
    workflows,
    authSignals: network.getAuthSignals(),
    findings,
    trustBoundaries: ['browser <-> API', 'role state <-> privileged APIs', 'client auth state <-> backend authorization'],
    nextAuditAreas: [
      'Privilege transition endpoints and role mutation semantics',
      'Business-logic mutation chains with weak auth dependencies',
      'Token handling, storage boundaries, and client-side trust assumptions',
    ],
    score: {
      attackSurface: new RiskScorer().score(endpoints, findings),
      authComplexity: Math.min(100, network.getAuthSignals().length * 10),
      dataSensitivity: Math.min(100, semanticApis.filter((s) => s.financial || s.privilegeSensitive).length * 8),
      interestingness: Math.min(100, workflowModels.length * 10 + findings.length * 4),
    },
  };

  dossier.findings = dossier.findings.concat(await pluginManager.run({ dossier, raw: { semanticApis, trustReport, workflows: workflowModels } }));

  const compressed = new AIContextCompressor().compress({
    graph,
    workflows: workflowModels,
    semanticApis,
    trust: trustReport,
    findings: dossier.findings,
  });

  await new AIExporter(output).exportAll(dossier);
  console.log(`WebApp Intelligence dossier written to ${output}`);
  console.log(`Executive Brief: ${compressed.executiveBrief}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
