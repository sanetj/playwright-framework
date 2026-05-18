import { NormalizedEvent } from '../events/normalized-event';

export interface TrustBoundaryReport {
  permissionMatrix: Array<{ role: string; action: string; endpoint?: string; allowed: boolean; evidence: string[] }>;
  endpointRoleMap: Record<string, string[]>;
  privilegedTransitions: Array<{ from: string; to: string; via: string }>;
  findings: string[];
}

export class TrustBoundaryEngine {
  analyze(events: NormalizedEvent[]): TrustBoundaryReport {
    const permissionMatrix: TrustBoundaryReport['permissionMatrix'] = [];
    const endpointRoleMap: Record<string, Set<string>> = {};
    const privilegedTransitions: TrustBoundaryReport['privilegedTransitions'] = [];
    const findings: string[] = [];

    for (const e of events) {
      const role = e.actor.role;
      if (e.type === 'api_request') {
        const ep = `${String((e.payload as Record<string, unknown>).method ?? 'GET')} ${String((e.payload as Record<string, unknown>).url ?? '')}`;
        endpointRoleMap[ep] = endpointRoleMap[ep] ?? new Set();
        endpointRoleMap[ep].add(role);
        const sensitive = /(admin|role|permission|transfer|billing|invoice|wallet|delete)/i.test(ep);
        const allowed = role === 'admin' || (role !== 'anonymous' && !/admin|role|permission/i.test(ep));
        permissionMatrix.push({ role, action: e.type, endpoint: ep, allowed, evidence: [e.id] });
        if (sensitive && role === 'anonymous') findings.push(`Sensitive endpoint called by anonymous role: ${ep}`);
      }
      if (e.type === 'auth_change' && e.beforeState && e.afterState && e.beforeState !== e.afterState) {
        privilegedTransitions.push({ from: e.beforeState, to: e.afterState, via: e.id });
      }
    }

    return {
      permissionMatrix,
      endpointRoleMap: Object.fromEntries(Object.entries(endpointRoleMap).map(([k, v]) => [k, [...v]])),
      privilegedTransitions,
      findings,
    };
  }
}
