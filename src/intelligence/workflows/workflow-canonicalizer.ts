import { ActionGraph, GraphNode, GraphEdge } from '../../graph/action-graph';

export class WorkflowCanonicalizer {
  private readonly idMaskRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b[0-9a-f]{24}\b|\b[a-zA-Z]+_[a-zA-Z0-9]+\b|\b\d+\b/gi;

  /**
   * Transforms an ActionGraph by masking dynamic IDs in routes and APIs,
   * collapsing SPA churn, and returning a canonicalized graph suitable for
   * cross-role differential comparison without false positives.
   */
  public canonicalize(graph: ActionGraph): ActionGraph {
    const rawData = graph.toJSON();
    const canonicalGraph = new ActionGraph();
    
    // Map original node IDs to their canonicalized versions
    const canonicalIdMap = new Map<string, string>();

    // 1. Canonicalize Nodes
    for (const node of rawData.nodes) {
      const canonicalLabel = this.maskIds(node.label);
      const canonicalId = this.maskIds(node.id);
      canonicalIdMap.set(node.id, canonicalId);

      // Only add if not already present (collapsing repeated states/APIs within same context)
      // The GraphBuilder uses ActionGraph.addNode which already deduplicates by ID.
      canonicalGraph.addNode({
        id: canonicalId,
        layer: node.layer,
        kind: node.kind,
        label: canonicalLabel,
        attrs: this.maskAttrs(node.attrs)
      });
    }

    // 2. Canonicalize Edges
    for (const edge of rawData.edges) {
      const canonicalFrom = canonicalIdMap.get(edge.from);
      const canonicalTo = canonicalIdMap.get(edge.to);

      if (canonicalFrom && canonicalTo && canonicalFrom !== canonicalTo) {
        canonicalGraph.addEdge({
          from: canonicalFrom,
          to: canonicalTo,
          kind: edge.kind,
          weight: edge.weight, // Summed by addEdge automatically if duplicate
          evidence: edge.evidence,
          layer: edge.layer
        });
      }
    }

    return canonicalGraph;
  }

  private maskIds(input: string): string {
    return input.replace(this.idMaskRegex, '{ID}');
  }

  private maskAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (typeof value === 'string') {
        masked[key] = this.maskIds(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }
}
