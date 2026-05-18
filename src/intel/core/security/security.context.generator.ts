import { ApiEndpoint, SecurityFinding, WorkflowStep } from '../../models/schema';

export class SecurityContextGenerator {
  public generateFindings(endpoints: ApiEndpoint[], workflows: WorkflowStep[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    for (const endpoint of endpoints) {
      if (endpoint.riskTags.includes('cors-exposed')) {
        findings.push({
          id: `finding:cors:${endpoint.id}`,
          category: 'cors',
          severity: 'medium',
          title: 'Endpoint reflects permissive CORS behavior',
          evidence: [endpoint.url],
          recommendation: 'Validate strict allowlist and disallow credentials for wildcard origins.',
          cwe: 'CWE-942',
          confidence: 0.72,
        });
      }
    }

    const stateChangingWithoutAuth = endpoints.filter(
      (e) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(e.method) && e.authObserved.length === 0,
    );

    if (stateChangingWithoutAuth.length > 0) {
      findings.push({
        id: 'finding:auth:missing-on-mutation',
        category: 'authz',
        severity: 'high',
        title: 'Potential unauthenticated state-changing API calls',
        evidence: stateChangingWithoutAuth.map((e) => `${e.method} ${e.url}`),
        recommendation: 'Verify endpoint-level authz checks and perform negative tests across roles.',
        cwe: 'CWE-306',
        confidence: 0.66,
      });
    }

    if (workflows.some((w) => w.action.includes('storage_write'))) {
      findings.push({
        id: 'finding:client:storage-token',
        category: 'client-storage',
        severity: 'medium',
        title: 'Client-side storage activity detected',
        evidence: workflows.filter((w) => w.action.includes('storage_write')).map((w) => w.action),
        recommendation: 'Inspect whether tokens or PII are persisted in local/session storage.',
        cwe: 'CWE-922',
        confidence: 0.61,
      });
    }

    return findings;
  }
}
