export type GraphLayer = 'structural' | 'behavioral' | 'security' | 'semantic';
export type EdgeKind = 'triggers' | 'mutates' | 'unlocks' | 'transitions_to' | 'authenticates' | 'escalates' | 'depends_on';

export interface GraphNode { id: string; layer: GraphLayer; kind: string; label: string; attrs: Record<string, unknown>; }
export interface GraphEdge { from: string; to: string; kind: EdgeKind; weight: number; evidence: string[]; layer: GraphLayer; }

export class ActionGraph {
  private nodes = new Map<string, GraphNode>();
  private adjacency = new Map<string, GraphEdge[]>();

  addNode(node: GraphNode): void {
    const normalized: GraphNode = { ...node, id: this.normalizeId(node.id) };
    if (!this.nodes.has(normalized.id)) this.nodes.set(normalized.id, normalized);
  }

  addEdge(edge: GraphEdge): void {
    const from = this.normalizeId(edge.from);
    const to = this.normalizeId(edge.to);
    if (from === to) return;
    const edges = this.adjacency.get(from) ?? [];
    const hit = edges.find((e) => e.to === to && e.kind === edge.kind && e.layer === edge.layer);
    if (hit) {
      hit.weight += edge.weight;
      hit.evidence = [...new Set([...hit.evidence, ...edge.evidence])];
    } else {
      edges.push({ ...edge, from, to, evidence: [...new Set(edge.evidence)] });
    }
    this.adjacency.set(from, edges);
  }

  neighbors(nodeId: string): GraphEdge[] { return this.adjacency.get(this.normalizeId(nodeId)) ?? []; }

  traverse(start: string, depth = 4): string[] {
    const root = this.normalizeId(start);
    const out: string[] = [];
    const q: Array<{ n: string; d: number }> = [{ n: root, d: 0 }];
    const seen = new Set<string>([root]);
    while (q.length) {
      const { n, d } = q.shift()!;
      out.push(n);
      if (d >= depth) continue;
      for (const e of this.neighbors(n)) if (!seen.has(e.to)) { seen.add(e.to); q.push({ n: e.to, d: d + 1 }); }
    }
    return out;
  }

  shortestPath(from: string, to: string): string[] {
    const src = this.normalizeId(from); const dst = this.normalizeId(to);
    const q: string[] = [src]; const prev = new Map<string, string | null>([[src, null]]);
    while (q.length) {
      const cur = q.shift()!; if (cur === dst) break;
      for (const e of this.neighbors(cur)) if (!prev.has(e.to)) { prev.set(e.to, cur); q.push(e.to); }
    }
    if (!prev.has(dst)) return [];
    const path: string[] = []; let cur: string | null = dst;
    while (cur) { path.push(cur); cur = prev.get(cur) ?? null; }
    return path.reverse();
  }

  toJSON(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return { nodes: [...this.nodes.values()], edges: [...this.adjacency.values()].flat() };
  }

  private normalizeId(id: string): string { return id.trim().replace(/\s+/g, ' '); }
}
