import { IntelligencePlugin, PluginContext, SecurityFinding } from '../../models/schema';

export class PluginManager {
  private readonly plugins: IntelligencePlugin[] = [];

  public register(plugin: IntelligencePlugin): void {
    this.plugins.push(plugin);
  }

  public async run(ctx: PluginContext): Promise<SecurityFinding[]> {
    const findings = await Promise.all(this.plugins.map((p) => p.run(ctx)));
    return findings.flat();
  }
}
