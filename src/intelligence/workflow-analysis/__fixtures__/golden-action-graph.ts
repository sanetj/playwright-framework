import { ActionGraph } from '../../../graph/action-graph';

/**
 * Creates a minimal, deterministic ActionGraph in-memory for golden testing.
 */
export function createGoldenActionGraph(): ActionGraph {
  const graph = new ActionGraph();

  // Add deterministic nodes
  graph.addNode({
    id: 'node_login',
    layer: 'structural',
    kind: 'api',
    label: '/api/auth/login',
    attrs: {}
  });

  graph.addNode({
    id: 'node_products',
    layer: 'structural',
    kind: 'api',
    label: '/api/products',
    attrs: {}
  });

  graph.addNode({
    id: 'node_checkout',
    layer: 'structural',
    kind: 'api',
    label: '/api/checkout',
    attrs: {}
  });

  graph.addNode({
    id: 'node_roles',
    layer: 'structural',
    kind: 'api',
    label: '/api/roles',
    attrs: {}
  });

  // Add deterministic transitions
  graph.addEdge({
    from: 'node_login',
    to: 'node_products',
    kind: 'navigation',
    weight: 1,
    evidence: ['click_login'],
    layer: 'behavioral'
  });

  graph.addEdge({
    from: 'node_products',
    to: 'node_checkout',
    kind: 'navigation',
    weight: 1,
    evidence: ['click_checkout'],
    layer: 'behavioral'
  });

  graph.addEdge({
    from: 'node_checkout',
    to: 'node_roles',
    kind: 'navigation',
    weight: 1,
    evidence: ['click_roles'],
    layer: 'behavioral'
  });

  return graph;
}
