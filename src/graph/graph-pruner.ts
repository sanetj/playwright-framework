import { KnowledgeGraph } from './knowledge-graph';

export class GraphPruner {
  /**
   * Prunes nodes that are no longer relevant, bounding the state growth.
   * Nodes explicitly marked 'isProtected' (e.g. Findings Lineage, Payment APIs) are spared.
   */
  public pruneEpoch(graph: KnowledgeGraph, currentEpoch: number, epochThreshold: number = 2) {
    const minAcceptableEpoch = currentEpoch - epochThreshold;
    const nodesToDelete: string[] = [];

    // Identify stale, unprotected nodes
    for (const [id, node] of graph.nodes.entries()) {
      if (!node.isProtected && node.lastSeenEpoch < minAcceptableEpoch) {
        nodesToDelete.push(id);
      }
    }

    // Decay confidence for nodes that barely survived
    for (const node of graph.nodes.values()) {
      if (!node.isProtected && node.lastSeenEpoch === minAcceptableEpoch) {
        node.confidence = Math.max(0, node.confidence - 0.2);
      }
    }

    // Prune nodes
    nodesToDelete.forEach(id => {
      graph.nodes.delete(id);
    });

    // Prune orphaned edges
    graph.edges = graph.edges.filter(edge => 
      graph.nodes.has(edge.sourceId) && graph.nodes.has(edge.targetId)
    );

    console.log(`[GraphPruner] Pruned ${nodesToDelete.length} stale nodes for epoch ${currentEpoch}.`);
  }

  public protectHighValueNode(graph: KnowledgeGraph, nodeId: string) {
    const node = graph.nodes.get(nodeId);
    if (node) {
      node.isProtected = true;
    }
  }
}
