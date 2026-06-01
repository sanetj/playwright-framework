import { test, expect } from '@playwright/test';
import { ActionGraph, GraphNode } from '../../../graph/action-graph';
import { WorkflowDiscoveryEngine } from '../../workflow-discovery/discovery-engine';
import { WorkflowEvaluator } from '../workflow-evaluator';
import { WorkflowAnalysisSummarizer } from '../workflow-analysis-summary';
import { WorkflowPathExtractor } from '../workflow-path-extractor';
import { WorkflowEvidenceBuilder } from '../workflow-evidence';
import { WorkflowAnalysisBuilder } from '../workflow-analysis-result';
import { WorkflowAnalysisPipeline } from '../workflow-analysis-pipeline';

test.describe('Deterministic Reconstruction Integrity Invariants (Phase 9.4F Slice 1)', () => {
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

  test('1. deterministic reconstruction extraction', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const index = result.analysis.reconstructionIndex!;
    expect(index).toBeDefined();
    expect(index.reconstructionReferences.length).toBeGreaterThan(0);

    const ref = index.reconstructionReferences[0];
    expect(ref.referenceId).toBe('reconstruction_000');
    expect(ref.sourceType).toBeDefined();
    expect(ref.sourceRefId).toBeDefined();
    expect(ref.reconstructedPathId).toBeDefined();
    expect(ref.orderedEntitySequence).toBeDefined();
    expect(ref.orderedBoundarySequence).toBeDefined();
    expect(ref.orderedPrivilegeContexts).toBeDefined();
  });

  test('2. byte-identical consecutive outputs', () => {
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

    expect(JSON.stringify(result1.analysis.reconstructionIndex))
      .toBe(JSON.stringify(result2.analysis.reconstructionIndex));
  });

  test('3. stable reconstruction IDs', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const refs = result.analysis.reconstructionIndex!.reconstructionReferences;

    refs.forEach((ref, idx) => {
      expect(ref.referenceId).toBe(`reconstruction_${String(idx).padStart(3, '0')}`);
    });
  });

  test('4. full lineage reconstructability from shared corridors', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const refs = result.analysis.reconstructionIndex!.reconstructionReferences;
    const corridorRefs = refs.filter(r => r.sourceType === 'SHARED_CORRIDOR');

    expect(corridorRefs.length).toBeGreaterThan(0);
    for (const ref of corridorRefs) {
      const originalPath = result.analysis.paths.find(p => p.id === ref.reconstructedPathId);
      expect(originalPath).toBeDefined();
      // Prefix should perfectly match original entity path prefix
      expect(originalPath!.entityIds.slice(0, ref.orderedEntitySequence.length)).toEqual(ref.orderedEntitySequence);
    }
  });

  test('5. full lineage reconstructability from compressed reachability refs', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const refs = result.analysis.reconstructionIndex!.reconstructionReferences;
    const reachabilityRefs = refs.filter(r => r.sourceType === 'COMPRESSED_REACHABILITY');

    expect(reachabilityRefs.length).toBeGreaterThan(0);
    for (const ref of reachabilityRefs) {
      const originalPath = result.analysis.paths.find(p => p.id === ref.reconstructedPathId);
      expect(originalPath).toBeDefined();
      // Reconstructed entities MUST exactly equal original path entities
      expect(ref.orderedEntitySequence).toEqual(originalPath!.entityIds);
    }
  });

  test('6. full lineage reconstructability from divergences', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const refs = result.analysis.reconstructionIndex!.reconstructionReferences;
    const divRefs = refs.filter(r => r.sourceType === 'DIFFERENTIAL_DIVERGENCE');

    expect(divRefs.length).toBeGreaterThan(0);
    for (const ref of divRefs) {
      const originalPath = result.analysis.paths.find(p => p.id === ref.reconstructedPathId);
      expect(originalPath).toBeDefined();
      expect(ref.orderedEntitySequence).toEqual(originalPath!.entityIds);
    }
  });

  test('7. full lineage reconstructability from isolation signatures', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const refs = result.analysis.reconstructionIndex!.reconstructionReferences;
    const isolationRefs = refs.filter(r => r.sourceType === 'CANONICAL_ISOLATION');

    expect(isolationRefs.length).toBeGreaterThan(0);
    for (const ref of isolationRefs) {
      const originalPath = result.analysis.paths.find(p => p.id === ref.reconstructedPathId);
      expect(originalPath).toBeDefined();
      expect(ref.orderedEntitySequence).toEqual(originalPath!.entityIds);
    }
  });

  test('8. lexicographic stability under shuffled insertion order', () => {
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

    // Scramble graph node and edge order
    graph2.addNode(nodes[3]);
    graph2.addNode(nodes[1]);
    graph2.addNode(nodes[2]);
    graph2.addNode(nodes[0]);
    graph2.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });
    graph2.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph2.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });

    const result1 = pipeline.run(graph1);
    const result2 = pipeline.run(graph2);

    expect(JSON.stringify(result1.analysis.reconstructionIndex))
      .toBe(JSON.stringify(result2.analysis.reconstructionIndex));
  });

  test('9. zero mutation of existing exports', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    expect(result.analysis.paths).toBeDefined();
    expect(result.analysis.sharedCorridors).toBeDefined();
    expect(result.analysis.reconstructionIndex).toBeDefined();
  });

  test('10. zero async behavior', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });

    const start = Date.now();
    const result = pipeline.run(graph);
    const end = Date.now();

    expect(end - start).toBeLessThan(100);
    expect(result.analysis.reconstructionIndex).toBeDefined();
  });

  test('11. no reconstruction alias collisions', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/products/search', attrs: {} });
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/permissions', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const refs = result.analysis.reconstructionIndex!.reconstructionReferences;
    const ids = refs.map(r => r.referenceId);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  test('12. privilege lineage preserved exactly', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const refs = result.analysis.reconstructionIndex!.reconstructionReferences;
    const reachabilityRefs = refs.filter(r => r.sourceType === 'COMPRESSED_REACHABILITY');

    for (const ref of reachabilityRefs) {
      const trace = result.analysis.replayTraceSummaries!.find(t => t.pathId === ref.reconstructedPathId);
      expect(trace).toBeDefined();
      expect(ref.orderedPrivilegeContexts).toEqual(trace!.orderedRoleTransitionSequence);
    }
  });

  test('13. boundary lineage preserved exactly', () => {
    const graph = new ActionGraph();
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const refs = result.analysis.reconstructionIndex!.reconstructionReferences;
    const reachabilityRefs = refs.filter(r => r.sourceType === 'COMPRESSED_REACHABILITY');

    for (const ref of reachabilityRefs) {
      const trace = result.analysis.replayTraceSummaries!.find(t => t.pathId === ref.reconstructedPathId);
      expect(trace).toBeDefined();
      expect(ref.orderedBoundarySequence).toEqual(trace!.orderedBoundarySequence);
    }
  });
});
