import { test, expect } from '@playwright/test';
import { WorkflowCanonicalizer } from '../../src/intelligence/workflows/workflow-canonicalizer';
import { ActionGraph } from '../../src/graph/action-graph';

test.describe('WorkflowCanonicalizer', () => {
  test('should mask UUIDs in node IDs and labels', () => {
    const graph = new ActionGraph();
    graph.addNode({
      id: 'api:GET:/users/123e4567-e89b-12d3-a456-426614174000/profile',
      kind: 'api',
      layer: 'structural',
      label: '/users/123e4567-e89b-12d3-a456-426614174000/profile',
      attrs: { tenant: '123e4567-e89b-12d3-a456-426614174000' }
    });

    const canonicalizer = new WorkflowCanonicalizer();
    const canonGraph = canonicalizer.canonicalize(graph);
    const nodes = canonGraph.toJSON().nodes;

    expect(nodes.length).toBe(1);
    expect(nodes[0].id).toBe('api:GET:/users/{ID}/profile');
    expect(nodes[0].label).toBe('/users/{ID}/profile');
    expect(nodes[0].attrs.tenant).toBe('{ID}');
  });

  test('should mask numeric IDs and collapse duplicates', () => {
    const graph = new ActionGraph();
    // Simulate multiple requests to same endpoint with different numeric IDs
    graph.addNode({ id: 'api:GET:/items/42', kind: 'api', layer: 'structural', label: '/items/42', attrs: {} });
    graph.addNode({ id: 'api:GET:/items/99', kind: 'api', layer: 'structural', label: '/items/99', attrs: {} });
    
    // Add edges from a common route
    graph.addNode({ id: 'route:/home', kind: 'route', layer: 'structural', label: '/home', attrs: {} });
    graph.addEdge({ from: 'route:/home', to: 'api:GET:/items/42', kind: 'triggers', layer: 'behavioral', weight: 1, evidence: [] });
    graph.addEdge({ from: 'route:/home', to: 'api:GET:/items/99', kind: 'triggers', layer: 'behavioral', weight: 1, evidence: [] });

    const canonicalizer = new WorkflowCanonicalizer();
    const canonGraph = canonicalizer.canonicalize(graph);
    
    const nodes = canonGraph.toJSON().nodes;
    const edges = canonGraph.toJSON().edges;

    // The two API nodes should collapse into one 'api:GET:/items/{ID}'
    // The route node stays as 'route:/home'
    expect(nodes.length).toBe(2); 
    
    const apiNode = nodes.find(n => n.kind === 'api');
    expect(apiNode?.id).toBe('api:GET:/items/{ID}');

    // The two edges should collapse into one edge with weight 2
    expect(edges.length).toBe(1);
    expect(edges[0].from).toBe('route:/home');
    expect(edges[0].to).toBe('api:GET:/items/{ID}');
    expect(edges[0].weight).toBe(2);
  });
  test('should mask prefix dynamic IDs and collapse duplicates', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'api:GET:/orders/req_abc123', kind: 'api', layer: 'structural', label: '/orders/req_abc123', attrs: {} });
    graph.addNode({ id: 'api:GET:/orders/req_xyz789', kind: 'api', layer: 'structural', label: '/orders/req_xyz789', attrs: {} });
    
    const canonicalizer = new WorkflowCanonicalizer();
    const canonGraph = canonicalizer.canonicalize(graph);
    const nodes = canonGraph.toJSON().nodes;
    
    expect(nodes.length).toBe(1);
    expect(nodes[0].id).toBe('api:GET:/orders/{ID}');
  });

  test('should mask Mongo ObjectIds and collapse duplicates', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'api:GET:/files/507f1f77bcf86cd799439011', kind: 'api', layer: 'structural', label: '/files/507f1f77bcf86cd799439011', attrs: {} });
    graph.addNode({ id: 'api:GET:/files/507f1f77bcf86cd799439012', kind: 'api', layer: 'structural', label: '/files/507f1f77bcf86cd799439012', attrs: {} });
    
    const canonicalizer = new WorkflowCanonicalizer();
    const canonGraph = canonicalizer.canonicalize(graph);
    const nodes = canonGraph.toJSON().nodes;
    
    expect(nodes.length).toBe(1);
    expect(nodes[0].id).toBe('api:GET:/files/{ID}');
  });

  test('should preserve semantic route names', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'api:GET:/api/organizations/users', kind: 'api', layer: 'structural', label: '/api/organizations/users', attrs: {} });
    graph.addNode({ id: 'api:GET:/api/subscriptions/users', kind: 'api', layer: 'structural', label: '/api/subscriptions/users', attrs: {} });
    
    const canonicalizer = new WorkflowCanonicalizer();
    const canonGraph = canonicalizer.canonicalize(graph);
    const nodes = canonGraph.toJSON().nodes;
    
    expect(nodes.length).toBe(2);
    expect(nodes.find(n => n.id === 'api:GET:/api/organizations/users')).toBeDefined();
    expect(nodes.find(n => n.id === 'api:GET:/api/subscriptions/users')).toBeDefined();
  });
});
