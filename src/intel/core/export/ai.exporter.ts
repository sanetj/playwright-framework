import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { AppContextDossier } from '../../models/schema';

export class AIExporter {
  constructor(private readonly outputDir: string) {}

  public async exportAll(dossier: AppContextDossier): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(this.outputDir, 'dossier.json'), JSON.stringify(dossier, null, 2)),
      fs.writeFile(path.join(this.outputDir, 'dossier.yaml'), this.toYaml(dossier)),
      fs.writeFile(path.join(this.outputDir, 'briefing.md'), this.toBriefing(dossier)),
      fs.writeFile(path.join(this.outputDir, 'graphs.mmd'), this.toMermaid(dossier)),
    ]);
  }

  private toYaml(input: unknown, indent = 0): string {
    if (Array.isArray(input)) return input.map((v) => `${' '.repeat(indent)}- ${this.toYaml(v, indent + 2).trimStart()}`).join('\n');
    if (input && typeof input === 'object') {
      return Object.entries(input as Record<string, unknown>)
        .map(([k, v]) => `${' '.repeat(indent)}${k}: ${typeof v === 'object' && v !== null ? `\n${this.toYaml(v, indent + 2)}` : String(v)}`)
        .join('\n');
    }
    return `${input ?? ''}`;
  }

  private toBriefing(d: AppContextDossier): string {
    return `# AI Security Briefing\n\n## Target\n${d.target}\n\n## Architecture\n${d.architectureSummary}\n\n## Critical APIs\n${d.endpoints.slice(0, 20).map((e) => `- ${e.method} ${e.url}`).join('\n')}\n\n## Findings\n${d.findings.map((f) => `- [${f.severity}] ${f.title}`).join('\n')}\n\n## Next Audit Areas\n${d.nextAuditAreas.map((n) => `- ${n}`).join('\n')}\n`;
  }

  private toMermaid(d: AppContextDossier): string {
    const edges = d.workflows
      .filter((w) => w.transitionTo)
      .map((w) => `  \"${w.routeId}\" --> \"${w.transitionTo}\"`)
      .join('\n');
    return `flowchart TD\n${edges}`;
  }
}
