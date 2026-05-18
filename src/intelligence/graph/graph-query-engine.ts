import { ActionGraph, GraphEdge } from './action-graph';

export class GraphQueryEngine {
  constructor(private readonly graph: ActionGraph) {}

  public detectCycles(startNodes: string[]): string[][] {
    const cycles: string[][] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const stack: string[] = [];
    const dfs = (node: string): void => {
      visiting.add(node); stack.push(node);
      for (const e of this.graph.neighbors(node)) {
        if (!visited.has(e.to) && !visiting.has(e.to)) dfs(e.to);
        else if (visiting.has(e.to)) cycles.push(stack.slice(stack.indexOf(e.to)).concat([e.to]));
      }
      visiting.delete(node); visited.add(node); stack.pop();
    };
    for (const s of startNodes) if (!visited.has(s)) dfs(s);
    return cycles;
  }

  public privilegedTransitions(): GraphEdge[] {
    return this.graph.toJSON().edges.filter((e) => /escalates|authenticates|privilege|role/i.test(e.kind));
  }

  public deadEnds(): string[] {
    const data = this.graph.toJSON();
    const nodes = new Set(data.nodes.map((n) => n.id));
    const withOutgoing = new Set(data.edges.map((e) => e.from));
    return [...nodes].filter((n) => !withOutgoing.has(n));
  }
}
