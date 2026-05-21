import { NormalizedEvent } from './normalized-event-bus';

export type ActionNodeType = 'page' | 'route' | 'modal' | 'form' | 'api' | 'ui-action' | 'role-state' | 'auth-state';
export type ActionEdgeType = 'click' | 'redirect' | 'api-trigger' | 'state-transition' | 'privilege-transition' | 'mutation';

export interface ActionGraphNode {
  id: string;
  type: ActionNodeType;
  label: string;
  attrs: Record<string, unknown>;
}

export interface ActionGraphEdge {
  from: string;
  to: string;
  type: ActionEdgeType;
  weight: number;
  evidence: string[];
}

/**
 * @deprecated Legacy Subsystem
 * @see src/intelligence/graph/action-graph.ts for the canonical Semantic Graph.
 * This class remains for backward compatibility and functions as an adapter.
 */
export class ActionGraph {
  private nodes = new Map<string, ActionGraphNode>();
  private adjacency = new Map<string, ActionGraphEdge[]>();

  public addNode(node: ActionGraphNode): void {
    if (!this.nodes.has(node.id)) this.nodes.set(node.id, node);
  }

  public addEdge(edge: Omit<ActionGraphEdge, 'weight'> & { weight?: number }): void {
    const normalized: ActionGraphEdge = { ...edge, weight: edge.weight ?? 1 };
    const existing = (this.adjacency.get(edge.from) ?? []).find((e) => e.to === edge.to && e.type === edge.type);
    if (existing) {
      existing.weight += normalized.weight;
      existing.evidence.push(...normalized.evidence);
      return;
    }
    this.adjacency.set(edge.from, [...(this.adjacency.get(edge.from) ?? []), normalized]);
  }

  public ingest(events: NormalizedEvent[]): void {
    const actionToApi = new Map<string, string[]>();

    for (const e of events) {
      if (e.type === 'navigation') {
        const route = String((e.data as Record<string, unknown>).to ?? e.ctx.pageUrl ?? 'unknown');
        this.addNode({ id: `route:${route}`, type: 'route', label: route, attrs: {} });
      }

      if (e.type === 'ui.action') {
        const actionName = String((e.data as Record<string, unknown>).action ?? 'ui-action');
        const actionId = e.ctx.actionId ?? e.id;
        this.addNode({ id: `action:${actionId}`, type: 'ui-action', label: actionName, attrs: e.data as Record<string, unknown> });
      }

      if (e.type === 'network.request') {
        const method = String((e.data as Record<string, unknown>).method ?? 'GET');
        const url = String((e.data as Record<string, unknown>).url ?? 'unknown');
        this.addNode({ id: `api:${method}:${url}`, type: 'api', label: `${method} ${url}`, attrs: e.data as Record<string, unknown> });
        if (e.ctx.actionId) {
          actionToApi.set(e.ctx.actionId, [...(actionToApi.get(e.ctx.actionId) ?? []), `api:${method}:${url}`]);
        }
      }

      if (e.type === 'auth') {
        const state = String((e.data as Record<string, unknown>).state ?? 'unknown');
        this.addNode({ id: `auth:${state}`, type: 'auth-state', label: state, attrs: {} });
      }
    }

    for (const e of events) {
      if (e.type === 'ui.action' && e.ctx.pageUrl) {
        this.addEdge({
          from: `route:${e.ctx.pageUrl}`,
          to: `action:${e.ctx.actionId ?? e.id}`,
          type: 'click',
          evidence: [e.id],
        });
      }

      if (e.type === 'navigation' && e.ctx.pageUrl) {
        const to = String((e.data as Record<string, unknown>).to ?? 'unknown');
        this.addEdge({ from: `route:${e.ctx.pageUrl}`, to: `route:${to}`, type: 'redirect', evidence: [e.id] });
      }

      if (e.type === 'ui.action' && e.ctx.actionId && actionToApi.has(e.ctx.actionId)) {
        for (const apiNode of actionToApi.get(e.ctx.actionId) ?? []) {
          this.addEdge({ from: `action:${e.ctx.actionId}`, to: apiNode, type: 'api-trigger', evidence: [e.id] });
        }
      }
    }
  }

  public findUnlockChains(startNode: string, maxDepth = 5): string[][] {
    const chains: string[][] = [];
    const dfs = (node: string, path: string[], depth: number): void => {
      if (depth > maxDepth) return;
      const next = this.adjacency.get(node) ?? [];
      if (next.length === 0) chains.push(path);
      for (const edge of next) dfs(edge.to, [...path, edge.to], depth + 1);
    };
    dfs(startNode, [startNode], 0);
    return chains;
  }

  public toJSON(): { nodes: ActionGraphNode[]; edges: ActionGraphEdge[] } {
    return { nodes: [...this.nodes.values()], edges: [...this.adjacency.values()].flat() };
  }
}
