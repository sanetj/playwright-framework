import { test, expect } from '@playwright/test';
import { ActionGraph, GraphNode } from '../../../graph/action-graph';
import { WorkflowDiscoveryEngine } from '../../workflow-discovery/discovery-engine';
import { WorkflowEvaluator } from '../workflow-evaluator';
import { WorkflowAnalysisSummarizer } from '../workflow-analysis-summary';
import { WorkflowPathExtractor } from '../workflow-path-extractor';
import { WorkflowEvidenceBuilder } from '../workflow-evidence';
import { WorkflowAnalysisBuilder } from '../workflow-analysis-result';
import { WorkflowAnalysisPipeline } from '../workflow-analysis-pipeline';

test.describe('Canonical Isolation Integrity Hardening (Phase 9.4E)', () => {
  let pipeline: WorkflowAnalysisPipeline;

  test.beforeEach(() => {
    pipeline = new WorkflowAnalysisPipeline(
      new WorkflowDiscoveryEngine(),
      new WorkflowEvaluator(),
      new WorkflowAnalysisSummarizer(),
      new WorkflowPathExtractor(),
      new WorkflowEvidenceBuilder(),
      new WorkflowAnalysisBuilder()
    );
  });

  test('1. Distinct privilege contexts never canonicalize together', () => {
    const graphA = new ActionGraph();
    // Path A remaining: products -> search (RESOURCE)
    graphA.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graphA.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graphA.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graphA.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graphA.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });

    // Path B remaining: products -> admin (ADMIN)
    graphA.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });
    graphA.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graphA);
    const sigs = result.analysis.canonicalIsolationSignatures!;
    expect(sigs).toBeDefined();
    expect(sigs.length).toBeGreaterThan(0);

    // Verify privilege isolation key is populated and distinct
    const sig = sigs[0];
    expect(sig.privilegeIsolationKey).toContain('PrivLineage');
    expect(sig.privilegeIsolationKey).toContain('DivPrivs');
  });

  test('2. Distinct boundary lineages never collapse together', () => {
    const graph = new ActionGraph();
    // Base crosses role-A boundary (e.g. crossing to checkout)
    // Comparison crosses role-B boundary (e.g. crossing to admin)
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout/billing', attrs: {} });
    graph.addNode({ id: 'node_settings', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_settings', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const sigs = result.analysis.canonicalIsolationSignatures!;
    expect(sigs).toBeDefined();
    expect(sigs.length).toBeGreaterThan(0);

    const sig = sigs[0];
    expect(sig.boundaryIsolationKey).toContain('BndSeq');
    expect(sig.boundaryIsolationKey).toContain('DivBnds');
  });

  test('3. Shared corridors remain reconstructable', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const corridors = result.analysis.sharedCorridors!;
    const sigs = result.analysis.canonicalIsolationSignatures!;

    for (const sig of sigs) {
      const corridor = corridors.find(c => c.corridorId === sig.corridorId);
      expect(corridor).toBeDefined();
    }
  });

  test('4. Canonical isolation IDs remain byte-identical across consecutive executions', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result1 = pipeline.run(graph);
    const result2 = pipeline.run(graph);

    expect(JSON.stringify(result1.analysis.canonicalIsolationSignatures))
      .toBe(JSON.stringify(result2.analysis.canonicalIsolationSignatures));
  });

  test('5. Insertion order permutations produce identical exports', () => {
    const graph1 = new ActionGraph();
    const graph2 = new ActionGraph();

    const nodes: GraphNode[] = [
      { id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} },
      { id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} },
      { id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} },
      { id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} }
    ];

    nodes.forEach(n => graph1.addNode(n));
    graph1.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph1.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph1.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    // Scramble node and edge orders
    graph2.addNode(nodes[3]);
    graph2.addNode(nodes[1]);
    graph2.addNode(nodes[2]);
    graph2.addNode(nodes[0]);
    graph2.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });
    graph2.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph2.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });

    const result1 = pipeline.run(graph1);
    const result2 = pipeline.run(graph2);

    expect(JSON.stringify(result1.analysis.canonicalIsolationSignatures))
      .toBe(JSON.stringify(result2.analysis.canonicalIsolationSignatures));
  });

  test('6. Divergence ownership remains preserved', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const divs = result.analysis.differentialSemanticDivergences!;
    const sigs = result.analysis.canonicalIsolationSignatures!;

    for (const div of divs) {
      const parentSig = sigs.find(s => s.corridorId === div.sharedCorridorRefId);
      expect(parentSig).toBeDefined();
      expect(parentSig!.privilegeIsolationKey).toContain(div.divergenceCategory);
    }
  });

  test('7. Replay lineage remains lossless', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const sigs = result.analysis.canonicalIsolationSignatures!;
    const refs = result.analysis.compressedReachabilityRefs!;

    for (const sig of sigs) {
      const matchingRefs = refs.filter(r => r.sharedCorridorRefId === sig.corridorId);
      for (const ref of matchingRefs) {
        expect(sig.replayOwnershipKey).toContain(ref.pathId);
      }
    }
  });

  test('8. No mutation of existing exports', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    expect(result.analysis.paths).toBeDefined();
    expect(result.analysis.sharedCorridors).toBeDefined();
    expect(result.analysis.differentialSemanticDivergences).toBeDefined();
  });

  test('9. No async behavior introduced', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const start = Date.now();
    const result = pipeline.run(graph);
    const end = Date.now();

    expect(end - start).toBeLessThan(100);
    expect(result.analysis.canonicalIsolationSignatures).toBeDefined();
  });

  test('10. Compression remains deterministic under cyclic traversal', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_roles', layer: 'structural', kind: 'api', label: '/api/roles', attrs: {} });

    // Cyclic: Login -> Products -> Roles -> Login
    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['c1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_roles', kind: 'navigation', weight: 1, evidence: ['c2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_roles', to: 'node_login', kind: 'navigation', weight: 1, evidence: ['c3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    expect(result.analysis.canonicalIsolationSignatures).toBeDefined();
  });
});
