import { InferredWorkflow } from '../workflow/workflow-engine';
import { RuntimeSecurityFinding } from '../security/runtime-security-detectors';
import { SemanticEndpoint } from '../semantic/semantic-api-analyzer';
import { TrustBoundaryReport } from '../trust/trust-boundary-engine';

export interface CompressedIntelContext {
  executiveBrief: string;
  workflowSummaries: Array<{ id: string; name: string; chainSize: number; keyStates: string[] }>;
  attackSurfaceSummary: string[];
  trustBoundarySummary: string[];
  suspiciousBehaviorSummary: string[];
  semanticEndpointClusters: Record<string, string[]>;
}

export class AIContextCompressor {
  compress(input: {
    workflows: InferredWorkflow[];
    findings: RuntimeSecurityFinding[];
    semanticEndpoints: SemanticEndpoint[];
    trust: TrustBoundaryReport;
  }): CompressedIntelContext {
    const clusters: Record<string, string[]> = { privilege: [], financial: [], destructive: [], ownership: [] };
    for (const ep of input.semanticEndpoints) {
      if (ep.privilegeMutation) clusters.privilege.push(ep.endpoint);
      if (ep.financial) clusters.financial.push(ep.endpoint);
      if (ep.destructive) clusters.destructive.push(ep.endpoint);
      if (ep.ownershipSensitive) clusters.ownership.push(ep.endpoint);
    }

    return {
      executiveBrief: `Workflows=${input.workflows.length}, endpoints=${input.semanticEndpoints.length}, trustFlags=${input.trust.findings.length}, runtimeFindings=${input.findings.length}.`,
      workflowSummaries: input.workflows.map((w) => ({ id: w.id, name: w.name, chainSize: w.chain.length, keyStates: [...new Set([...w.successStates, ...w.failureStates])].slice(0, 6) })),
      attackSurfaceSummary: [...new Set([...clusters.privilege, ...clusters.financial, ...clusters.destructive])],
      trustBoundarySummary: input.trust.findings.slice(0, 20),
      suspiciousBehaviorSummary: input.findings.sort((a, b) => b.confidence - a.confidence).slice(0, 20).map((f) => `${f.severity}:${f.title}`),
      semanticEndpointClusters: clusters,
    };
  }
}
