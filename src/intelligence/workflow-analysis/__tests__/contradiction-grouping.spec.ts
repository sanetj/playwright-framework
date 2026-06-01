import { test, expect } from '@playwright/test';
import { ActionGraph } from '../../../graph/action-graph';
import { WorkflowDiscoveryEngine } from '../../workflow-discovery/discovery-engine';
import { WorkflowEvaluator } from '../workflow-evaluator';
import { WorkflowAnalysisSummarizer } from '../workflow-analysis-summary';
import { WorkflowPathExtractor } from '../workflow-path-extractor';
import { WorkflowEvidenceBuilder } from '../workflow-evidence';
import { WorkflowAnalysisBuilder } from '../workflow-analysis-result';
import { WorkflowAnalysisPipeline } from '../workflow-analysis-pipeline';

test.describe('Contradiction Grouping and Isolation Verification', () => {
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

  test('1. Normal Flow scenario — zero structural contradictions', () => {
    const graph = new ActionGraph();

    graph.addNode({
      id: 'node_products',
      layer: 'structural',
      kind: 'api',
      label: '/api/products',
      attrs: {}
    });

    graph.addNode({
      id: 'node_orders',
      layer: 'structural',
      kind: 'api',
      label: '/api/orders',
      attrs: {}
    });

    graph.addEdge({
      from: 'node_products',
      to: 'node_orders',
      kind: 'navigation',
      weight: 1,
      evidence: ['evt_1'],
      layer: 'behavioral'
    });

    const result = pipeline.run(graph);
    expect(result.analysis.groupedContradictions).toBeDefined();
    expect(result.analysis.groupedContradictions).toHaveLength(0);
  });

  test('2. Cross-role Contradiction Flow scenario — comprehensive category verification', () => {
    const graph = new ActionGraph();

    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
    graph.addNode({ id: 'node_roles', layer: 'structural', kind: 'api', label: '/api/roles', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_checkout', to: 'node_roles', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const groups = result.analysis.groupedContradictions;

    expect(groups).toBeDefined();
    expect(groups!.length).toBeGreaterThan(0);

    // Verify categories are pre-sorted lexicographically
    const categories = groups!.map(g => g.category);
    const sortedCategories = [...categories].sort();
    expect(categories).toEqual(sortedCategories);

    // Ensure all target categories are mapped
    expect(categories).toContain('PRIVILEGE_TRANSITION');
    expect(categories).toContain('REACHABILITY_ASYMMETRY');
    expect(categories).toContain('TRUST_BOUNDARY_CROSSING');
    expect(categories).toContain('WORKFLOW_BYPASS');

    // Inspect privilege transition signals
    const privGroup = groups!.find(g => g.category === 'PRIVILEGE_TRANSITION');
    expect(privGroup).toBeDefined();
    expect(privGroup!.signals.length).toBeGreaterThan(0);
    for (const signal of privGroup!.signals) {
      expect(signal.description).toContain('privilege');
    }

    // Inspect reachability asymmetry signals
    const reachGroup = groups!.find(g => g.category === 'REACHABILITY_ASYMMETRY');
    expect(reachGroup).toBeDefined();
    expect(reachGroup!.signals[0].type).toBe('UNEXPECTED_PRIVILEGED_REACHABILITY');

    // Inspect workflow bypass signals
    const bypassGroup = groups!.find(g => g.category === 'WORKFLOW_BYPASS');
    expect(bypassGroup).toBeDefined();
    expect(bypassGroup!.signals[0].type).toBe('STRUCTURAL_WORKFLOW_BYPASS');
  });

  test('3. Cyclic Traversal scenario — robust loop handling & determinism', () => {
    const graph = new ActionGraph();

    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_roles', layer: 'structural', kind: 'api', label: '/api/roles', attrs: {} });

    // Login -> Products -> Roles -> Login (Cycle)
    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['c1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_roles', kind: 'navigation', weight: 1, evidence: ['c2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_roles', to: 'node_login', kind: 'navigation', weight: 1, evidence: ['c3'], layer: 'behavioral' });

    // Run pipeline multiple times to ensure zero drift
    const result1 = pipeline.run(graph);
    const result2 = pipeline.run(graph);

    expect(result1.analysis.groupedContradictions).toEqual(result2.analysis.groupedContradictions);

    const groups = result1.analysis.groupedContradictions!;
    expect(groups.length).toBeGreaterThan(0);

    // Verify each group's internal signals are lexicographically sorted
    for (const group of groups) {
      const types = group.signals.map(s => s.type);
      const sortedTypes = [...types].sort();
      expect(types).toEqual(sortedTypes);
    }
  });
});
