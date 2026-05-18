import { SecurityFinding } from '../../models/schema';
import { ActionGraph } from './action-graph';
import { SemanticApiModel } from './semantic-api-analyzer';
import { TrustBoundaryReport } from './trust-boundary-engine';
import { WorkflowModel } from './workflow-engine';

export interface CompressedContext {
  executiveBrief: string;
  technicalDossier: Record<string, unknown>;
  workflowSummaries: Array<{ name: string; summary: string; mermaid: string }>;
  attackSurfaceSummary: string[];
  suspiciousFindingsSummary: Array<{ severity: string; title: string; evidence: string[] }>;
  endpointClusters: Record<string, string[]>;
  trustBoundaryExplanation: string[];
}

export class AIContextCompressor {
  public compress(params: {
    graph: ActionGraph;
    workflows: WorkflowModel[];
    semanticApis: SemanticApiModel[];
    trust: TrustBoundaryReport;
    findings: SecurityFinding[];
  }): CompressedContext {
    const endpointClusters = this.clusterEndpoints(params.semanticApis);
    const topFindings = [...params.findings].sort((a, b) => this.sevScore(b.severity) - this.sevScore(a.severity)).slice(0, 20);

    const executiveBrief = [
      `Discovered ${params.workflows.length} inferred workflow(s) and ${params.semanticApis.length} semantic API endpoint(s).`,
      `High-risk surfaces: ${params.semanticApis.filter((s) => s.privilegeSensitive || s.financial || s.destructive).length}.`,
      `Trust mismatches flagged: ${params.trust.findings.length}.`,
      `Security findings: ${params.findings.length} total, ${topFindings.filter((f) => ['high', 'critical'].includes(f.severity)).length} high/critical.`,
    ].join(' ');

    return {
      executiveBrief,
      technicalDossier: {
        graph: params.graph.toJSON(),
        workflows: params.workflows,
        semanticApis: params.semanticApis,
        trust: params.trust,
      },
      workflowSummaries: params.workflows.map((w) => ({ name: w.name, summary: w.summary, mermaid: w.mermaid })),
      attackSurfaceSummary: [
        ...new Set(params.semanticApis.filter((s) => s.privilegeSensitive || s.financial || s.destructive).map((s) => s.endpointId)),
      ],
      suspiciousFindingsSummary: topFindings.map((f) => ({ severity: f.severity, title: f.title, evidence: f.evidence.slice(0, 4) })),
      endpointClusters,
      trustBoundaryExplanation: params.trust.findings.map((f) => `${f.title}: ${f.evidence.join(' | ')}`),
    };
  }

  private clusterEndpoints(semantics: SemanticApiModel[]): Record<string, string[]> {
    const clusters: Record<string, string[]> = { privileged: [], financial: [], destructive: [], crud: [] };
    for (const s of semantics) {
      if (s.privilegeSensitive) clusters.privileged.push(s.endpointId);
      if (s.financial) clusters.financial.push(s.endpointId);
      if (s.destructive) clusters.destructive.push(s.endpointId);
      if (['create', 'read', 'update', 'delete'].includes(s.semantic)) clusters.crud.push(s.endpointId);
    }
    return clusters;
  }

  private sevScore(sev: string): number {
    return { critical: 5, high: 4, medium: 3, low: 2, info: 1 }[sev] ?? 0;
  }
}
