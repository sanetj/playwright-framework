import { ApiEndpoint, SecurityFinding } from '../../models/schema';

export class RiskScorer {
  public score(endpoints: ApiEndpoint[], findings: SecurityFinding[]): number {
    const mutatingEndpoints = endpoints.filter((e) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(e.method)).length;
    const highFindings = findings.filter((f) => ['high', 'critical'].includes(f.severity)).length;
    return Math.min(100, mutatingEndpoints * 2 + highFindings * 10 + endpoints.length);
  }
}
