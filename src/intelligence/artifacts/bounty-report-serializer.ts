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
      
      const buildValidationAwareConfidence = (f: any) => {
        let score = 0.0;
        let severity = f.severity;
        const factors: string[] = [];

        if (f.validationConfidence === 'HIGH') {
          score = 1.0;
          severity = 'HIGH';
        } else if (f.validationConfidence === 'MEDIUM') {
          score = 0.7;
          severity = 'MEDIUM';
        } else if (f.validationConfidence === 'LOW') {
          score = 0.3;
          severity = 'LOW';
        }

        if (f.isValidated === true) {
          factors.push('Deterministic Replay Verified');
        } else if (f.isValidated === false || f.validationConfidence === 'LOW') {
          factors.push('Unvalidated');
        }

        if (f.proofs && f.proofs.length > 0) {
          factors.push('Proof Constructed');
        }

        if (f.type === 'PRIVILEGE_ESCALATION_CANDIDATE') {
          factors.push('Clear Auth Boundary Crossed');
        }

        return { score, severity, factors };
      };

      const realConfidence = buildValidationAwareConfidence(finding);
      md += triageGen.generate(finding.type, finding.priority, realConfidence as any, finding.targetEndpoint, finding.description);
      md += impactGen.buildImpact(bundle.differentialAnalysis.baseRole, bundle.differentialAnalysis.comparisonRole, method, url, method === 'DELETE', url.includes('admin') || url.includes('user'));
      md += reproGen.buildNarrative(bundle.evidenceExchanges.slice(0,1) as any, bundle.evidenceExchanges[bundle.evidenceExchanges.length -1] as any);
      md += `---\n\n`;
    }

    // --- Slice D: Path Family Clustering (Serializer Local) ---
    const getPathOnly = (u: string): string => {
      const match = u.match(/https?:\/\/[^\/]+(\/.*)/);
      if (match && match[1]) {
        return match[1].split('?')[0];
      }
      const idx = u.indexOf('/');
      if (idx !== -1 && !u.startsWith('http')) {
        return u.substring(idx).split('?')[0];
      }
      return u.split('?')[0] || u;
    };

    const maskIds = (u: string): string => {
      const idMaskRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b[0-9a-f]{24}\b|\b[a-zA-Z]+_[a-zA-Z0-9]+\b|\b\d+\b/gi;
      return u.replace(idMaskRegex, '{ID}');
    };

    const clusters: Record<string, {
      pathFamily: string;
      findingsCount: number;
      validatedCount: number;
      unvalidatedCount: number;
      findingTypes: Set<string>;
    }> = {};

    for (const finding of bundle.differentialAnalysis.findings) {
      if (!finding.targetEndpoint) continue;
      
      const parts = finding.targetEndpoint.split(':');
      const url = parts.length > 2 ? parts.slice(2).join(':') : finding.targetEndpoint;
      
      let pathFamily = url;
      try {
        pathFamily = maskIds(getPathOnly(url));
      } catch (e) {
        // Fallback to raw string
      }

      const clusterKey = pathFamily;

      if (!clusters[clusterKey]) {
        clusters[clusterKey] = {
          pathFamily: clusterKey,
          findingsCount: 0,
          validatedCount: 0,
          unvalidatedCount: 0,
          findingTypes: new Set<string>()
        };
      }

      clusters[clusterKey].findingsCount++;
      if ((finding as any).isValidated === true) {
        clusters[clusterKey].validatedCount++;
      } else {
        clusters[clusterKey].unvalidatedCount++;
      }
      clusters[clusterKey].findingTypes.add(finding.type);
    }

    const clusterKeys = Object.keys(clusters);
    if (clusterKeys.length > 0) {
      md += `## Clusters\n\n`;
      for (const key of clusterKeys) {
        const c = clusters[key];
        md += `### Path Family: ${c.pathFamily}\n\n`;
        md += `- Total Findings: ${c.findingsCount}\n`;
        md += `- Validated: ${c.validatedCount}\n`;
        md += `- Unvalidated: ${c.unvalidatedCount}\n`;
        md += `- Finding Types:\n`;
        for (const ftype of c.findingTypes) {
          md += `  - ${ftype}\n`;
        }
        md += `\n`;
      }
    }
    // --- End Slice D ---

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
