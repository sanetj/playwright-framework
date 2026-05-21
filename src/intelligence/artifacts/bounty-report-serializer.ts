import { writeFileSync } from 'node:fs';
import { InvestigationBundle } from './ai-bundle-compressor';

export class BountyReportSerializer {
  public serializeToMarkdown(bundle: InvestigationBundle, outputPath: string): void {
    let md = `# Investigation Bundle: ${bundle.targetDomain}\n\n`;
    md += `**Base Role**: ${bundle.differentialAnalysis.baseRole}\n`;
    md += `**Comparison Role**: ${bundle.differentialAnalysis.comparisonRole}\n\n`;

    md += `## Findings (${bundle.differentialAnalysis.findings.length})\n\n`;

    for (const finding of bundle.differentialAnalysis.findings) {
      md += `### ${finding.type} on \`${finding.targetEndpoint}\`\n`;
      md += `**Severity**: ${finding.severity}\n`;
      md += `**Description**: ${finding.description}\n\n`;
      
      md += `#### Replay Evidence Lineage\n`;
      md += `- Base Replay Context: \`${bundle.differentialAnalysis.baseRole}\`\n`;
      md += `- Comparison Replay Context: \`${bundle.differentialAnalysis.comparisonRole}\`\n\n`;
    }

    md += `## Evidence Exchanges (${bundle.evidenceExchanges.length})\n\n`;

    for (const ex of bundle.evidenceExchanges) {
      md += `### Exchange \`${ex.exchangeId}\` (Session: ${ex.sessionId})\n`;
      
      md += `**Request:**\n`;
      md += '```http\n';
      md += `${ex.request.method} ${ex.request.url} HTTP/1.1\n`;
      ex.request.headers.forEach(h => {
        md += `${h.name}: ${h.value}\n`;
      });
      if (ex.request.bodySnippet) {
        md += `\n${ex.request.bodySnippet}\n`;
      }
      md += '```\n\n';

      md += `**Response:**\n`;
      md += '```http\n';
      md += `HTTP/1.1 ${ex.response.status}\n`;
      ex.response.headers.forEach(h => {
        md += `${h.name}: ${h.value}\n`;
      });
      if (ex.response.bodySnippet) {
        md += `\n${ex.response.bodySnippet}\n`;
      }
      md += '```\n\n';
    }

    writeFileSync(outputPath, md, 'utf-8');
  }
}
