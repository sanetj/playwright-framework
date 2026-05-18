#!/usr/bin/env node
import path from 'node:path';
import { IntelligentCrawler } from '../core/crawler/intelligent.crawler';
import { WorkflowInferenceEngine } from '../core/workflow/workflow.inference';
import { SecurityContextGenerator } from '../core/security/security.context.generator';
import { RiskScorer } from '../core/scoring/risk.scorer';
import { AIExporter } from '../core/export/ai.exporter';
import { PluginManager } from '../core/plugins/plugin.manager';
import { jwtAnalyzerPlugin } from '../core/plugins/jwt-analyzer.plugin';
import { AppContextDossier } from '../models/schema';

async function main(): Promise<void> {
  const target = process.argv[2];
  if (!target) throw new Error('Usage: intel <url> [out-dir]');

  const output = process.argv[3] ?? path.join(process.cwd(), 'artifacts', 'intel');
  const crawler = new IntelligentCrawler();
  const inferredWorkflows = new WorkflowInferenceEngine();
  const securityGenerator = new SecurityContextGenerator();
  const pluginManager = new PluginManager();
  pluginManager.register(jwtAnalyzerPlugin);

  const { routes, workflows, network } = await crawler.crawl(target);
  const normalizedWorkflows = inferredWorkflows.infer(routes, workflows);
  const findings = securityGenerator.generateFindings(network.getEndpoints(), normalizedWorkflows);

  const dossier: AppContextDossier = {
    target,
    generatedAt: new Date().toISOString(),
    architectureSummary: 'Detected browser-rendered application with API-backed workflows and dynamic client state transitions.',
    technologies: ['Playwright-observed', 'SPA-candidate'],
    routes,
    endpoints: network.getEndpoints(),
    workflows: normalizedWorkflows,
    authSignals: network.getAuthSignals(),
    findings,
    trustBoundaries: ['browser <-> API', 'authenticated user <-> privileged workflows'],
    nextAuditAreas: [
      'Privilege transition flows around admin/settings endpoints',
      'State-changing endpoints without explicit CSRF and origin controls',
      'Client-side token lifecycle and storage handling',
    ],
    score: {
      attackSurface: new RiskScorer().score(network.getEndpoints(), findings),
      authComplexity: Math.min(100, network.getAuthSignals().length * 10),
      dataSensitivity: 60,
      interestingness: Math.min(100, findings.length * 12),
    },
  };

  dossier.findings = dossier.findings.concat(await pluginManager.run({ dossier, raw: {} }));

  await new AIExporter(output).exportAll(dossier);
  console.log(`WebApp Intelligence dossier written to ${output}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
