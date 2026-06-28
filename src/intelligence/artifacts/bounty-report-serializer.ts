import { writeFileSync } from 'node:fs';
import { InvestigationBundle } from './ai-bundle-compressor';
import * as fs from 'fs';
import * as path from 'path';

export class BountyReportSerializer {
  public serializeToMarkdown(bundle: InvestigationBundle, outputPath: string): void {
    let md = `# Investigation Bundle: ${bundle.targetDomain}\n\n`;
    md += `**Investigation ID**: ${bundle.investigationId}\n`;
    md += `**Export Mode**: ${bundle.exportMode || 'Unknown'}\n`;
    
    md += `## Prioritized Candidates (${bundle.prioritizedCandidates.length})\n\n`;
    for (const cand of bundle.prioritizedCandidates) {
      md += `### ${cand.candidateIdentity}\n`;
      md += `- **Type**: ${cand.candidateType}\n`;
      md += `- **Target**: ${cand.targetEntityId}\n`;
      md += `- **Priority Rank**: ${cand.priorityRank}\n`;
    }

    md += `\n## Evidence Exchanges (${bundle.evidenceExchanges.length})\n\n`;

    for (const ex of bundle.evidenceExchanges) {
      const exId = typeof ex.exchangeId === 'object' && ex.exchangeId ? ex.exchangeId.id : ex.exchangeId;
      md += `### Exchange \`${exId}\`\n`;
      md += `**Request:**\n`;
      md += '```http\n';
      md += `${ex.request.method} ${ex.request.url} HTTP/1.1\n`;
      md += '```\n\n';
    }

    writeFileSync(outputPath, md, 'utf-8');
  }
}
