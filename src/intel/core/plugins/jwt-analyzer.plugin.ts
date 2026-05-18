import { IntelligencePlugin, PluginContext, SecurityFinding } from '../../models/schema';

export const jwtAnalyzerPlugin: IntelligencePlugin = {
  name: 'jwt-analyzer',
  version: '1.0.0',
  description: 'Flags weak JWT patterns and long-lived token smells based on observed traffic.',
  async run(ctx: PluginContext): Promise<SecurityFinding[]> {
    const bearerEndpoints = ctx.dossier.endpoints.filter((e) => e.authObserved.includes('authorization'));
    if (bearerEndpoints.length === 0) return [];

    return [
      {
        id: 'plugin:jwt:review-needed',
        category: 'jwt',
        severity: 'info',
        title: 'JWT usage observed; verify signing algorithms and expiry strategy',
        evidence: bearerEndpoints.slice(0, 5).map((e) => `${e.method} ${e.url}`),
        recommendation: 'Test for alg=none acceptance, weak secrets, and missing aud/iss validation.',
        cwe: 'CWE-347',
        confidence: 0.58,
      } as SecurityFinding,
    ];
  },
};
