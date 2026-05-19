import { ApiEndpoint, AuthSignal, SecurityFinding } from '../../models/schema';
import { SemanticApiModel } from './semantic-api-analyzer';

export interface PermissionMatrixRow {
  role: string;
  endpointId: string;
  allowed: boolean;
  evidence: string[];
}

export interface TrustBoundaryReport {
  permissionMatrix: PermissionMatrixRow[];
  roleToEndpoint: Record<string, string[]>;
  authDependencyGraph: Record<string, string[]>;
  findings: SecurityFinding[];
}

export class TrustBoundaryEngine {
  public analyze(endpoints: ApiEndpoint[], semantics: SemanticApiModel[], authSignals: AuthSignal[]): TrustBoundaryReport {
    const roles = ['anonymous', 'authenticated', 'admin'];
    const permissionMatrix: PermissionMatrixRow[] = [];
    const roleToEndpoint: Record<string, string[]> = { anonymous: [], authenticated: [], admin: [] };
    const authDependencyGraph: Record<string, string[]> = {};
    const findings: SecurityFinding[] = [];

    for (const endpoint of endpoints) {
      const sem = semantics.find((s) => s.endpointId === endpoint.id);
      const highRisk = !!sem && (sem.privilegeSensitive || sem.financial || sem.destructive);
      const hasAuthEvidence = endpoint.authObserved.length > 0 || authSignals.some((a) => a.mechanism !== 'unknown');

      for (const role of roles) {
        const allowed = role === 'admin' ? true : role === 'authenticated' ? !highRisk : !highRisk && endpoint.method === 'GET';
        permissionMatrix.push({ role, endpointId: endpoint.id, allowed, evidence: [endpoint.url] });
        if (allowed) roleToEndpoint[role].push(endpoint.id);
      }

      authDependencyGraph[endpoint.id] = hasAuthEvidence ? ['auth:session', 'auth:token'] : ['auth:none'];

      if (highRisk && !hasAuthEvidence) {
        findings.push({
          id: `trust:auth-mismatch:${endpoint.id}`,
          category: 'trust-boundary',
          severity: 'high',
          title: 'High-risk endpoint lacks observable auth dependency',
          evidence: [endpoint.url, endpoint.method],
          recommendation: 'Verify server-side authorization and deny-by-default controls.',
          confidence: 0.71,
          cwe: 'CWE-285',
        });
      }
    }

    return { permissionMatrix, roleToEndpoint, authDependencyGraph, findings };
  }
}
