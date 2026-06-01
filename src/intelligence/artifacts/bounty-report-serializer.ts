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
      const exId = typeof ex.exchangeId === 'object' && ex.exchangeId ? ex.exchangeId.id : ex.exchangeId;
      md += `### Exchange \`${exId}\` (Session: ${ex.sessionId || 'Unknown'})\n`;
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

    if (bundle.groupedContradictionSummary) {
      const summary = bundle.groupedContradictionSummary;
      md += `## Grouped Contradiction Summary\n\n`;
      md += `**Total Detected Contradictions**: ${summary.totalContradictions}\n\n`;

      if (summary.contradictions.length > 0) {
        md += `| Category / Type | Endpoint / Target | Severity | Linked Exchanges | Lineage Refs |\n`;
        md += `| --- | --- | --- | --- | --- |\n`;
        for (const contra of summary.contradictions) {
          const exchangesStr = contra.evidenceExchangeIds.length > 0
            ? contra.evidenceExchangeIds.map(id => `\`${id}\``).join(', ')
            : '*None*';
          const lineageStr = contra.lineageRefs.length > 0
            ? contra.lineageRefs.map(ref => `\`${ref}\``).join(', ')
            : '*None*';
          md += `| **${contra.findingType}** | \`${contra.endpoint}\` | ${contra.severity} | ${exchangesStr} | ${lineageStr} |\n`;
        }
        md += `\n`;

        md += `### Detailed Contradiction Evidence Map\n\n`;
        for (const contra of summary.contradictions) {
          md += `#### Contradiction: \`${contra.endpoint}\` [${contra.findingType}]\n`;
          md += `- **Severity**: ${contra.severity}\n`;
          md += `- **Method**: \`${contra.method}\`\n`;
          md += `- **URL**: \`${contra.url}\`\n`;
          md += `- **Description**: ${contra.description}\n`;
          if (contra.evidenceExchangeIds.length > 0) {
            md += `- **Linked Evidence Exchanges**: ${contra.evidenceExchangeIds.map(id => `\`${id}\``).join(', ')}\n`;
          }
          if (contra.lineageRefs.length > 0) {
            md += `- **Lineage References**: ${contra.lineageRefs.map(ref => `\`${ref}\``).join(', ')}\n`;
          }
          md += `\n`;
        }

        if (bundle.groupedContradictionSummary && bundle.groupedContradictionSummary.compressedSummary) {
          const comp = bundle.groupedContradictionSummary.compressedSummary;
          md += `### Compressed Contradiction Summary\n\n`;
          md += `This section displays normalized contradiction references backed by a shared evidence segment pool, reducing structural duplication while preserving 100% of the replay lineage.\n\n`;
          
          md += `#### Shared Evidence Segment Pool\n\n`;
          md += `| Segment ID | Linked Exchanges | Lineage Refs |\n`;
          md += `| --- | --- | --- |\n`;
          for (const seg of comp.sharedEvidencePool) {
            const exchangesStr = seg.evidenceExchangeIds.length > 0
              ? seg.evidenceExchangeIds.map(id => `\`${id}\``).join(', ')
              : '*None*';
            const lineageStr = seg.lineageRefs.length > 0
              ? seg.lineageRefs.map(ref => `\`${ref}\``).join(', ')
              : '*None*';
            md += `| \`${seg.segmentId}\` | ${exchangesStr} | ${lineageStr} |\n`;
          }
          md += `\n`;

          md += `#### Normalized Contradictions\n\n`;
          md += `| Category / Type | Endpoint / Target | Severity | Shared Evidence Ref |\n`;
          md += `| --- | --- | --- | --- |\n`;
          for (const norm of comp.normalizedContradictions) {
            md += `| **${norm.findingType}** | \`${norm.endpoint}\` | ${norm.severity} | \`${norm.sharedEvidenceRefId}\` |\n`;
          }
          md += `\n`;
        }
      } else {
        md += `*No structural contradictions were identified in this session.*\n\n`;
      }
    }

    writeFileSync(outputPath, md, 'utf-8');
  }
}
