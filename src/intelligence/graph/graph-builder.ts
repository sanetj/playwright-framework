import { NormalizedEvent } from '../events/normalized-event';
import { ActionGraph } from './action-graph';

export class GraphBuilder {
  build(events: NormalizedEvent[]): ActionGraph {
    const g = new ActionGraph();
    for (const e of events) {
      const routeNode = `route:${e.route.path}`;
      g.addNode({ id: routeNode, layer: 'structural', kind: 'route', label: e.route.path, attrs: { url: e.route.url } });

      if (e.type === 'api_request') {
        const p = e.payload as Record<string, unknown>;
        const endpoint = `${String(p.method ?? 'GET').toUpperCase()} ${String(p.url ?? '')}`;
        const apiNode = `api:${endpoint}`;
        g.addNode({ id: apiNode, layer: 'structural', kind: 'api', label: endpoint, attrs: p });
        g.addEdge({ from: routeNode, to: apiNode, kind: 'triggers', weight: 1, evidence: [e.id], layer: 'behavioral' });
        if (/(post|put|patch|delete)/i.test(endpoint)) g.addEdge({ from: routeNode, to: apiNode, kind: 'mutates', weight: 1, evidence: [e.id], layer: 'behavioral' });
      }

      if (e.type === 'click' || e.type === 'form_submit' || e.type === 'input') {
        const actionNode = `action:${e.id}`;
        g.addNode({ id: actionNode, layer: 'behavioral', kind: e.type, label: e.type, attrs: e.payload as Record<string, unknown> });
        g.addEdge({ from: routeNode, to: actionNode, kind: 'depends_on', weight: 1, evidence: [e.id], layer: 'behavioral' });
      }

      if (e.beforeState && e.afterState && e.beforeState !== e.afterState) {
        const b = `state:${e.beforeState}`; const a = `state:${e.afterState}`;
        g.addNode({ id: b, layer: 'security', kind: 'state', label: e.beforeState, attrs: {} });
        g.addNode({ id: a, layer: 'security', kind: 'state', label: e.afterState, attrs: {} });
        g.addEdge({ from: b, to: a, kind: e.type === 'auth_change' ? 'authenticates' : 'transitions_to', weight: 1, evidence: [e.id], layer: 'security' });
        if (/elevated|admin/i.test(e.afterState)) g.addEdge({ from: b, to: a, kind: 'escalates', weight: 1, evidence: [e.id], layer: 'security' });
      }

      if (e.type === 'route_transition') {
        const to = String((e.payload as Record<string, unknown>).to ?? e.route.path);
        const toPath = (() => { try { return new URL(to).pathname; } catch { return to; } })();
        const targetNode = `route:${toPath}`;
        g.addNode({ id: targetNode, layer: 'structural', kind: 'route', label: toPath, attrs: { url: to } });
        g.addEdge({ from: routeNode, to: targetNode, kind: 'unlocks', weight: 1, evidence: [e.id], layer: 'behavioral' });
      }
    }
    return g;
  }
}
