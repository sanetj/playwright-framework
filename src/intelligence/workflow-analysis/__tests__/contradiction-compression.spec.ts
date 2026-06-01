import { test, expect } from '@playwright/test';
import { ActionGraph } from '../../../graph/action-graph';
import { WorkflowDiscoveryEngine } from '../../workflow-discovery/discovery-engine';
import { WorkflowEvaluator } from '../workflow-evaluator';
import { WorkflowAnalysisSummarizer } from '../workflow-analysis-summary';
import { WorkflowPathExtractor } from '../workflow-path-extractor';
import { WorkflowEvidenceBuilder } from '../workflow-evidence';
import { WorkflowAnalysisBuilder } from '../workflow-analysis-result';
import { WorkflowAnalysisPipeline } from '../workflow-analysis-pipeline';

test.describe('Contradiction Lineage Compression & Reconstruction Verification', () => {
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

  test('1. Repeated-path scenario — deterministic lineage pooling and compression', () => {
    const graph = new ActionGraph();

    // Setup multiple paths that share identical boundary/entity sets
    graph.addNode({ id: 'node_login_1', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products_1', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_roles_1', layer: 'structural', kind: 'api', label: '/api/roles', attrs: {} });

    graph.addNode({ id: 'node_login_2', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products_2', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_roles_2', layer: 'structural', kind: 'api', label: '/api/roles', attrs: {} });

    // Path 1
    graph.addEdge({ from: 'node_login_1', to: 'node_products_1', kind: 'navigation', weight: 1, evidence: ['p1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products_1', to: 'node_roles_1', kind: 'navigation', weight: 1, evidence: ['p2'], layer: 'behavioral' });

    // Path 2
    graph.addEdge({ from: 'node_login_2', to: 'node_products_2', kind: 'navigation', weight: 1, evidence: ['p3'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products_2', to: 'node_roles_2', kind: 'navigation', weight: 1, evidence: ['p4'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const compressed = result.analysis.compressedLineage;
    
    expect(compressed).toBeDefined();
    expect(compressed!.sharedLineagePool.length).toBeGreaterThan(0);

    // Verify duplicate structural lineages were pooled together
    // (Ensure the number of unique pooled segments is strictly less than the total number of normalized signals)
    expect(compressed!.sharedLineagePool.length).toBeLessThan(compressed!.normalizedSignals.length);

    // Verify full reconstruction is completely preserved
    for (const norm of compressed!.normalizedSignals) {
      const segment = compressed!.sharedLineagePool.find(s => s.segmentId === norm.sharedLineageRefId);
      expect(segment).toBeDefined();
      expect(segment!.evidenceLinks.length).toBeGreaterThan(0);
    }
  });

  test('2. Cyclic traversal scenario — loop safety & ordering preservation', () => {
    const graph = new ActionGraph();

    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_roles', layer: 'structural', kind: 'api', label: '/api/roles', attrs: {} });

    // Cycle: Login -> Products -> Roles -> Login
    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['c1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_roles', kind: 'navigation', weight: 1, evidence: ['c2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_roles', to: 'node_login', kind: 'navigation', weight: 1, evidence: ['c3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const compressed = result.analysis.compressedLineage;

    expect(compressed).toBeDefined();
    
    // Ensure stable, deterministic pre-sorted segment IDs
    const segmentIds = compressed!.sharedLineagePool.map(s => s.segmentId);
    const sortedSegmentIds = [...segmentIds].sort();
    expect(segmentIds).toEqual(sortedSegmentIds);

    // Ensure reconstructed evidence matches cycle links
    for (const norm of compressed!.normalizedSignals) {
      const segment = compressed!.sharedLineagePool.find(s => s.segmentId === norm.sharedLineageRefId);
      expect(segment).toBeDefined();
    }
  });

  test('3. Cross-role contradiction scenario — accurate normalization maps', () => {
    const graph = new ActionGraph();

    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
    graph.addNode({ id: 'node_roles', layer: 'structural', kind: 'api', label: '/api/roles', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['x1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['x2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_checkout', to: 'node_roles', kind: 'navigation', weight: 1, evidence: ['x3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const compressed = result.analysis.compressedLineage;

    expect(compressed).toBeDefined();

    // Verify presence of all expected normalized contradiction signals
    const types = compressed!.normalizedSignals.map(s => s.type);
    expect(types).toContain('PRIVILEGE_AMPLIFICATION_PATH');
    expect(types).toContain('ROLE_CHAIN_ESCALATION');
    expect(types).toContain('UNEXPECTED_PRIVILEGED_REACHABILITY');
    expect(types).toContain('STRUCTURAL_WORKFLOW_BYPASS');
  });
});
