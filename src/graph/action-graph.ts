export type GraphLayer = 'structural' | 'behavioral' | 'security' | 'semantic';

export interface GraphNode { id: string; layer: GraphLayer; kind: string; label: string; attrs: Record<string, unknown>; }
export interface GraphEdge { from: string; to: string; kind: string; weight: number; evidence: string[]; layer: GraphLayer; }

/**
 * @canonical
 * The definitive Semantic Graph authority for the Browser Runtime Intelligence Platform.
 */
/**
 * @architecture_authority Global State Topology
 * @responsibility Provides an immutable, deterministic mapping of state transitions and workflows.
 * @allowed_dependencies Base Types Only
 * @forbidden_dependencies All other subsystems
 */
export class ActionGraph {
  private nodes = new Map<string, GraphNode>();
  private adjacency = new Map<string, GraphEdge[]>();

  addNode(node: GraphNode): void { if (!this.nodes.has(node.id)) this.nodes.set(node.id, node); }
  addEdge(edge: GraphEdge): void {
    const edges = this.adjacency.get(edge.from) ?? [];
    const hit = edges.find((e) => e.to === edge.to && e.kind === edge.kind && e.layer === edge.layer);
    if (hit) { hit.weight += edge.weight; hit.evidence.push(...edge.evidence); return; }
    edges.push(edge); this.adjacency.set(edge.from, edges);
  }
  neighbors(nodeId: string): GraphEdge[] { return this.adjacency.get(nodeId) ?? []; }
  shortestPath(from: string, to: string): string[] {
    const q: string[] = [from]; const prev = new Map<string, string | null>(); prev.set(from, null);
    while (q.length) {
      const cur = q.shift()!; if (cur === to) break;
      for (const e of this.neighbors(cur)) if (!prev.has(e.to)) { prev.set(e.to, cur); q.push(e.to); }
    }
    if (!prev.has(to)) return [];
    const path: string[] = []; let cur: string | null = to;
    while (cur) { path.push(cur); cur = prev.get(cur) ?? null; }
    return path.reverse();
  }
  toJSON(): { nodes: GraphNode[]; edges: GraphEdge[] } { return { nodes: Array.from(this.nodes.values()), edges: Array.from(this.adjacency.values()).flat() }; }
}
