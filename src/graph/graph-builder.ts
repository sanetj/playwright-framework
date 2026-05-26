import { NormalizedEvent } from '../intelligence/events/normalized-event';
import { ActionGraph } from './action-graph';

export class GraphBuilder {
  build(events: NormalizedEvent[]): ActionGraph {
    const g = new ActionGraph();
    for (const e of events) {
      g.addNode({ id: `route:${e.route.path}`, layer: 'structural', kind: 'route', label: e.route.path, attrs: {} });
      if (e.type === 'api_request') {
        const p = e.payload as Record<string, unknown>;
        const api = `${String(p.method ?? 'GET')}:${String(p.url ?? 'unknown')}`;
        g.addNode({ id: `api:${api}`, layer: 'structural', kind: 'api', label: api, attrs: p });
        g.addEdge({ from: `route:${e.route.path}`, to: `api:${api}`, kind: 'triggers', weight: 1, evidence: [e.id], layer: 'behavioral' });
      }
      if (e.type === 'click' || e.type === 'form_submit') {
        g.addNode({ id: `action:${e.id}`, layer: 'behavioral', kind: e.type, label: e.type, attrs: e.payload as Record<string, unknown> });
        g.addEdge({ from: `route:${e.route.path}`, to: `action:${e.id}`, kind: 'contains_action', weight: 1, evidence: [e.id], layer: 'behavioral' });
      }
      if (e.beforeState && e.afterState && e.beforeState !== e.afterState) {
        g.addNode({ id: `state:${e.beforeState}`, layer: 'security', kind: 'state', label: e.beforeState, attrs: {} });
        g.addNode({ id: `state:${e.afterState}`, layer: 'security', kind: 'state', label: e.afterState, attrs: {} });
        g.addEdge({ from: `state:${e.beforeState}`, to: `state:${e.afterState}`, kind: 'state_transition', weight: 1, evidence: [e.id], layer: 'security' });
      }
    }
    return g;
  }
}
