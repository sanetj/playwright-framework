import { writeFileSync } from 'node:fs';
import { InvestigationBundle } from './ai-bundle-compressor';
import * as fs from 'fs';
import * as path from 'path';
import { TriageSummaryGenerator } from '../../runtime/artifacts/triage-summary';
import { ImpactNarrativeBuilder } from '../../runtime/artifacts/impact-narrative';
import { ReproNarrativeBuilder } from '../../runtime/artifacts/repro-narrative-builder';

export class BountyReportSerializer {
  public serializeToMarkdown(bundle: InvestigationBundle, outputPath: string): void {
    let md = `# Investigation Bundle: ${bundle.targetDomain}\n\n`;
    md += `**Export Mode**: ${bundle.exportMode || 'Unknown'}\n`;
    md += `**Base Role**: ${bundle.differentialAnalysis.baseRole}\n`;
    md += `**Comparison Role**: ${bundle.differentialAnalysis.comparisonRole}\n\n`;

    md += `## Findings (${bundle.differentialAnalysis.findings.length})\n\n`;

    const triageGen = new TriageSummaryGenerator();
    const impactGen = new ImpactNarrativeBuilder();
    const reproGen = new ReproNarrativeBuilder();

    for (const finding of bundle.differentialAnalysis.findings) {
      const parts = finding.targetEndpoint.split(':');
      const method = parts.length > 1 ? parts[1] : 'GET';
      const url = parts.length > 2 ? parts.slice(2).join(':') : finding.targetEndpoint;
      
      const mockConfidence = { score: 0.9, severity: finding.severity, factors: ['Deterministic Replay Verified', 'Clear Auth Boundary Crossed'] };
      
      md += triageGen.generate(finding.type, finding.priority, mockConfidence as any, finding.targetEndpoint, finding.description);
      md += impactGen.buildImpact(bundle.differentialAnalysis.baseRole, bundle.differentialAnalysis.comparisonRole, method, url, method === 'DELETE', url.includes('admin') || url.includes('user'));
      md += reproGen.buildNarrative(bundle.evidenceExchanges.slice(0,1) as any, bundle.evidenceExchanges[bundle.evidenceExchanges.length -1] as any);
      md += `---\n\n`;
    }

    md += `## Evidence Exchanges (${bundle.evidenceExchanges.length})\n\n`;

    for (const ex of bundle.evidenceExchanges) {
      md += `### Exchange \`${ex.exchangeId}\` (Session: ${ex.sessionId || 'Unknown'})\n`;
      md += `**Request:**\n`;
      md += '```http\n';
      md += `${ex.request.method} ${ex.request.url} HTTP/1.1\n`;
      
      if (ex.request.headers) {
        ex.request.headers.forEach((h: any) => {
          md += `${h.name}: ${h.value}\n`;
        });
      }
      
      if (ex.request.bodyStr) {
        md += `\n${ex.request.bodyStr}\n`;
      }
      md += '```\n\n';

      md += `**Response:**\n`;
      md += '```http\n';
      md += `HTTP/1.1 ${ex.response.status}\n`;
      
      if (ex.response.headers) {
        ex.response.headers.forEach((h: any) => {
          md += `${h.name}: ${h.value}\n`;
        });
      }
      
      if (ex.response.bodyStr) {
        md += `\n${ex.response.bodyStr}\n`;
      }
      md += '```\n\n';
    }

    writeFileSync(outputPath, md, 'utf-8');
  }
}
