import { test, expect } from '@playwright/test';
import { ActionGraph, GraphNode } from '../../../graph/action-graph';
import { WorkflowDiscoveryEngine } from '../../workflow-discovery/discovery-engine';
import { WorkflowEvaluator } from '../workflow-evaluator';
import { WorkflowAnalysisSummarizer } from '../workflow-analysis-summary';
import { WorkflowPathExtractor } from '../workflow-path-extractor';
import { WorkflowEvidenceBuilder } from '../workflow-evidence';
import { WorkflowAnalysisBuilder } from '../workflow-analysis-result';
import { WorkflowAnalysisPipeline } from '../workflow-analysis-pipeline';

test.describe('Deterministic Shared Reachability Corridor Canonicalization', () => {
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

  test('A) Identical corridors discovered in different traversal orders canonicalize into ONE shared corridor', () => {
    const graph1 = new ActionGraph();
    const graph2 = new ActionGraph();

    // Setup identical nodes for both graphs
    const nodes: GraphNode[] = [
      { id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} },
      { id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} },
      { id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} },
      { id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} }
    ];

    // Graph 1 insertion order: login -> products -> checkout -> search
    nodes.forEach(n => graph1.addNode(n));
    graph1.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph1.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph1.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    // Graph 2 insertion order: reverse node list and different edge order
    [...nodes].reverse().forEach(n => graph2.addNode(n));
    graph2.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });
    graph2.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph2.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });

    const result1 = pipeline.run(graph1);
    const result2 = pipeline.run(graph2);

    // Both should canonicalize to the exact same single shared corridor
    expect(result1.analysis.sharedCorridors).toHaveLength(1);
    expect(result2.analysis.sharedCorridors).toHaveLength(1);

    const corr1 = result1.analysis.sharedCorridors![0];
    const corr2 = result2.analysis.sharedCorridors![0];

    expect(corr1.corridorId).toBe('corridor_000');
    expect(corr2.corridorId).toBe('corridor_000');

    expect(corr1.orderedEntitySequence).toEqual(corr2.orderedEntitySequence);
    expect(corr1.orderedTransitionSequence).toEqual(corr2.orderedTransitionSequence);
    expect(corr1.orderedBoundarySequence).toEqual(corr2.orderedBoundarySequence);
    expect(corr1.privilegeContextLineage).toEqual(corr2.privilegeContextLineage);
  });

  test('B) Structurally different corridors NEVER merge', () => {
    const graph = new ActionGraph();

    // Branch 1: AUTH -> RESOURCE -> PAYMENT
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });

    // Branch 2: AUTH -> RESOURCE -> ADMIN
    graph.addNode({ id: 'node_admin', layer: 'structural', kind: 'api', label: '/api/admin/roles', attrs: {} });
    graph.addEdge({ from: 'node_products', to: 'node_admin', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const corridors = result.analysis.sharedCorridors!;

    // Here, AUTH -> RESOURCE is the maximal prefix shared by [Path 1, Path 2]
    // Because products -> checkout and products -> admin are different privilege contexts (PAYMENT vs ADMIN),
    // they represent different structural terminations and remain isolated in their suffixes (remainingEntitySequence)
    expect(corridors).toHaveLength(1);
    expect(corridors[0].orderedEntitySequence).toEqual(['wf_ent_node_login', 'wf_ent_node_products']);
    expect(corridors[0].privilegeContextLineage).toEqual(['AUTH', 'RESOURCE']);
  });

  test('C) Repeated executions produce byte-identical output (Determinism)', () => {
    const graph = new ActionGraph();

    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e4'], layer: 'behavioral' });

    const result1 = pipeline.run(graph);
    const result2 = pipeline.run(graph);

    expect(JSON.stringify(result1.analysis.sharedCorridors))
      .toBe(JSON.stringify(result2.analysis.sharedCorridors));
    expect(JSON.stringify(result1.analysis.compressedReachabilityRefs))
      .toBe(JSON.stringify(result2.analysis.compressedReachabilityRefs));
  });

  test('D) Reconstruction remains fully lossless', () => {
    const graph = new ActionGraph();

    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const corridors = result.analysis.sharedCorridors!;
    const refs = result.analysis.compressedReachabilityRefs!;

    expect(corridors).toHaveLength(1);
    const corridor = corridors[0];

    for (const ref of refs) {
      const originalPath = result.analysis.paths.find(p => p.id === ref.pathId);
      expect(originalPath).toBeDefined();

      const reconstructedEntities = [...corridor.orderedEntitySequence, ...ref.remainingEntitySequence];
      expect(reconstructedEntities).toEqual(originalPath!.entityIds);
    }
  });

  test('E) Corridor IDs remain lexicographically stable', () => {
    const graph = new ActionGraph();

    // Create multiple branching roots to generate multiple corridors
    // Branch A: AUTH -> RESOURCE -> PAYMENT
    graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
    graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
    graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
    graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
    graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

    // Branch B: TENANT -> RESOURCE -> ADMIN
    graph.addNode({ id: 'node_tenant', layer: 'structural', kind: 'api', label: '/api/tenant/settings', attrs: {} });
    graph.addNode({ id: 'node_billing', layer: 'structural', kind: 'api', label: '/api/billing', attrs: {} });
    graph.addNode({ id: 'node_roles', layer: 'structural', kind: 'api', label: '/api/roles', attrs: {} });
    graph.addNode({ id: 'node_users', layer: 'structural', kind: 'api', label: '/api/users', attrs: {} });
    graph.addEdge({ from: 'node_tenant', to: 'node_billing', kind: 'navigation', weight: 1, evidence: ['e4'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_billing', to: 'node_roles', kind: 'navigation', weight: 1, evidence: ['e5'], layer: 'behavioral' });
    graph.addEdge({ from: 'node_billing', to: 'node_users', kind: 'navigation', weight: 1, evidence: ['e6'], layer: 'behavioral' });

    const result = pipeline.run(graph);
    const corridors = result.analysis.sharedCorridors!;

    expect(corridors.length).toBeGreaterThanOrEqual(2);

    // Verify IDs are sorted in strict ascending lexicographical order
    const corridorIds = corridors.map(c => c.corridorId);
    const sortedIds = [...corridorIds].sort();

    expect(corridorIds).toEqual(sortedIds);
    expect(corridorIds[0]).toBe('corridor_000');
    expect(corridorIds[1]).toBe('corridor_001');
  });

  test.describe('Deterministic Corridor Intersection Indexing', () => {
    test('1. Shared prefix divergence produces a deterministic intersection node', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const index = result.analysis.corridorIntersectionIndex;

      expect(index).toBeDefined();
      expect(index!.intersections).toHaveLength(1);

      const intersection = index!.intersections[0];
      expect(intersection.intersectionId).toBe('intersection_000');
      expect(intersection.orderedSharedPrefix).toEqual(['wf_ent_node_login', 'wf_ent_node_products']);
      expect(intersection.divergenceEntityIds).toEqual(['wf_ent_node_checkout', 'wf_ent_node_search']);
      expect(intersection.participatingCorridorIds).toHaveLength(1);
      expect(intersection.divergenceBoundaryContexts).toBeDefined();
    });

    test('2. Multi-branch corridor fan-out supports multiple participating corridors', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
      graph.addNode({ id: 'node_reviews', layer: 'structural', kind: 'api', label: '/api/reviews', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_reviews', kind: 'navigation', weight: 1, evidence: ['e4'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const index = result.analysis.corridorIntersectionIndex;

      expect(index!.intersections).toHaveLength(1);
      const intersection = index!.intersections[0];

      // Verifies fanned-out diverging entities are mapped correctly and lexicographically sorted
      expect(intersection.divergenceEntityIds).toEqual([
        'wf_ent_node_checkout',
        'wf_ent_node_reviews',
        'wf_ent_node_search'
      ]);
    });

    test('3. Repeated executions produce byte-identical intersection structures', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result1 = pipeline.run(graph);
      const result2 = pipeline.run(graph);

      expect(JSON.stringify(result1.analysis.corridorIntersectionIndex))
        .toBe(JSON.stringify(result2.analysis.corridorIntersectionIndex));
    });

    test('4. Cross-role isolation is fully maintained', () => {
      const graph = new ActionGraph();

      // Branch A (AUTH -> RESOURCE)
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });

      // Branch B (TENANT -> BILLING)
      graph.addNode({ id: 'node_tenant', layer: 'structural', kind: 'api', label: '/api/tenant/settings', attrs: {} });
      graph.addNode({ id: 'node_billing', layer: 'structural', kind: 'api', label: '/api/billing', attrs: {} });
      graph.addEdge({ from: 'node_tenant', to: 'node_billing', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const index = result.analysis.corridorIntersectionIndex;

      // Since there is zero common prefix sequence of length >= 1 between Branch A and Branch B,
      // no false intersections can be merged
      expect(index!.intersections).toHaveLength(0);
    });

    test('5. Distinct divergence points do not collapse', () => {
      const graph = new ActionGraph();

      // Branch A: login -> products -> (checkout OR search)
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      // Branch B: tenant -> billing -> (invoice OR ledger)
      graph.addNode({ id: 'node_tenant', layer: 'structural', kind: 'api', label: '/api/tenant/settings', attrs: {} });
      graph.addNode({ id: 'node_billing', layer: 'structural', kind: 'api', label: '/api/billing', attrs: {} });
      graph.addNode({ id: 'node_invoice', layer: 'structural', kind: 'api', label: '/api/invoice', attrs: {} });
      graph.addNode({ id: 'node_ledger', layer: 'structural', kind: 'api', label: '/api/ledger', attrs: {} });
      graph.addEdge({ from: 'node_tenant', to: 'node_billing', kind: 'navigation', weight: 1, evidence: ['e4'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_billing', to: 'node_invoice', kind: 'navigation', weight: 1, evidence: ['e5'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_billing', to: 'node_ledger', kind: 'navigation', weight: 1, evidence: ['e6'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const index = result.analysis.corridorIntersectionIndex;

      // Two distinct, isolated divergence points are indexed, in strict sorted lexicographical order
      expect(index!.intersections).toHaveLength(2);
      expect(index!.intersections[0].intersectionId).toBe('intersection_000');
      expect(index!.intersections[1].intersectionId).toBe('intersection_001');
    });

    test('6. Replay lineage reconstruction integrity remains intact', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const corridors = result.analysis.sharedCorridors!;
      const refs = result.analysis.compressedReachabilityRefs!;

      for (const ref of refs) {
        const originalPath = result.analysis.paths.find(p => p.id === ref.pathId);
        expect(originalPath).toBeDefined();

        const corridor = corridors.find(c => c.corridorId === ref.sharedCorridorRefId);
        expect(corridor).toBeDefined();

        const reconstructed = [...corridor!.orderedEntitySequence, ...ref.remainingEntitySequence];
        expect(reconstructed).toEqual(originalPath!.entityIds);
      }
    });
  });

  test.describe('Canonical Corridor Identity Stabilization', () => {
    test('1. Identical corridors always produce identical canonical identities', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const identities = result.analysis.canonicalCorridorIdentities;

      expect(identities).toBeDefined();
      expect(identities).toHaveLength(1);

      const identity = identities![0];
      expect(identity.corridorId).toBe('corridor_000');
      expect(identity.canonicalIdentityKey).toContain('ENTITY:wf_ent_node_login>wf_ent_node_products');
      expect(identity.orderedEntitySequenceHash).toBe('ENTITY_SEQ:wf_ent_node_login>wf_ent_node_products');
      expect(identity.orderedTransitionSequenceHash).toBe('TRANSITION_SEQ:/api/auth/login -> /api/products');
      expect(identity.orderedBoundarySequenceHash).toBe('BOUNDARY_SEQ:wf_bnd_role');
      expect(identity.privilegeContextHash).toBe('PRIVILEGE_SEQ:AUTH>RESOURCE');
    });

    test('2. Structurally different corridors NEVER collide', () => {
      const graph = new ActionGraph();

      // Branch A: login -> products (AUTH -> RESOURCE)
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });

      // Branch B: tenant -> billing (TENANT -> PAYMENT)
      graph.addNode({ id: 'node_tenant', layer: 'structural', kind: 'api', label: '/api/tenant/settings', attrs: {} });
      graph.addNode({ id: 'node_billing', layer: 'structural', kind: 'api', label: '/api/billing', attrs: {} });
      graph.addEdge({ from: 'node_tenant', to: 'node_billing', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });

      // Ensure we have branched paths to generate both corridors
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e4'], layer: 'behavioral' });

      graph.addNode({ id: 'node_invoice', layer: 'structural', kind: 'api', label: '/api/invoice', attrs: {} });
      graph.addNode({ id: 'node_ledger', layer: 'structural', kind: 'api', label: '/api/ledger', attrs: {} });
      graph.addEdge({ from: 'node_billing', to: 'node_invoice', kind: 'navigation', weight: 1, evidence: ['e5'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_billing', to: 'node_ledger', kind: 'navigation', weight: 1, evidence: ['e6'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const identities = result.analysis.canonicalCorridorIdentities!;

      expect(identities.length).toBeGreaterThanOrEqual(2);
      expect(identities[0].canonicalIdentityKey).not.toBe(identities[1].canonicalIdentityKey);
    });

    test('3. Repeated executions produce byte-identical canonical identity exports', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result1 = pipeline.run(graph);
      const result2 = pipeline.run(graph);

      expect(JSON.stringify(result1.analysis.canonicalCorridorIdentities))
        .toBe(JSON.stringify(result2.analysis.canonicalCorridorIdentities));
    });

    test('4. Privilege lineage differences prevent identity collisions', () => {
      const graph1 = new ActionGraph();
      const graph2 = new ActionGraph();

      // Graph 1: node_login has role category AUTH
      graph1.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph1.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph1.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph1.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
      graph1.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph1.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph1.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      // Graph 2: same IDs, but node_login has ADMIN category (e.g. roles endpoint)
      graph2.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/admin/roles', attrs: {} });
      graph2.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph2.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph2.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
      graph2.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph2.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph2.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result1 = pipeline.run(graph1);
      const result2 = pipeline.run(graph2);

      const ident1 = result1.analysis.canonicalCorridorIdentities![0];
      const ident2 = result2.analysis.canonicalCorridorIdentities![0];

      // Verifies that privilege contexts separate their canonical composite keys
      expect(ident1.privilegeContextHash).toBe('PRIVILEGE_SEQ:AUTH>RESOURCE');
      expect(ident2.privilegeContextHash).toBe('PRIVILEGE_SEQ:ADMIN>RESOURCE');
      expect(ident1.canonicalIdentityKey).not.toBe(ident2.canonicalIdentityKey);
    });

    test('5. Corridor ordering changes do NOT affect canonical identities', () => {
      const graph = new ActionGraph();
      const nodes: GraphNode[] = [
        { id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} },
        { id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} },
        { id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} },
        { id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} }
      ];

      // Re-inserting elements in scrambled order
      [...nodes].reverse().forEach(n => graph.addNode(n));
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const identity = result.analysis.canonicalCorridorIdentities![0];

      // Key must match identical structure regardless of insertion scrambled traversal
      expect(identity.canonicalIdentityKey).toContain('ENTITY:wf_ent_node_login>wf_ent_node_products');
    });

    test('6. Reconstruction integrity remains fully lossless under canonical indexing', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const corridors = result.analysis.sharedCorridors!;
      const refs = result.analysis.compressedReachabilityRefs!;

      for (const ref of refs) {
        const originalPath = result.analysis.paths.find(p => p.id === ref.pathId);
        expect(originalPath).toBeDefined();

        const corridor = corridors.find(c => c.corridorId === ref.sharedCorridorRefId);
        expect(corridor).toBeDefined();

        const reconstructed = [...corridor!.orderedEntitySequence, ...ref.remainingEntitySequence];
        expect(reconstructed).toEqual(originalPath!.entityIds);
      }
    });

    test('7. Canonical identities derive ONLY from sharedCorridors', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const corridors = result.analysis.sharedCorridors!;
      const identities = result.analysis.canonicalCorridorIdentities!;

      // Asserts mapping is 1-to-1 derived purely from derived corridors list size
      expect(identities).toHaveLength(corridors.length);
      for (const ident of identities) {
        const correspondingCorridor = corridors.find(c => c.corridorId === ident.corridorId);
        expect(correspondingCorridor).toBeDefined();
      }
    });
  });

  test.describe('Canonical Corridor Normalization Hardening', () => {
    test('A) Different discovery order produces the EXACT SAME normalized signature', () => {
      const graph1 = new ActionGraph();
      const graph2 = new ActionGraph();

      // Scrambled insertion order in Graph 1
      graph1.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph1.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph1.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph1.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
      graph1.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph1.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph1.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      // Scrambled insertion order in Graph 2
      graph2.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
      graph2.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph2.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph2.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph2.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });
      graph2.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph2.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });

      const result1 = pipeline.run(graph1);
      const result2 = pipeline.run(graph2);

      const sig1 = result1.analysis.normalizedCorridorSignatures![0];
      const sig2 = result2.analysis.normalizedCorridorSignatures![0];

      expect(sig1.signatureId).toBe('signature_000');
      expect(sig2.signatureId).toBe('signature_000');
      expect(sig1.canonicalIdentityKey).toBe(sig2.canonicalIdentityKey);
      expect(sig1.normalizedEntitySequence).toEqual(sig2.normalizedEntitySequence);
      expect(sig1.normalizedTransitionSequence).toEqual(sig2.normalizedTransitionSequence);
    });

    test('B) Different privilege lineage NEVER normalize together', () => {
      const graph = new ActionGraph();

      // Branch A (AUTH -> RESOURCE)
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      // Branch B (ADMIN -> RESOURCE)
      graph.addNode({ id: 'node_tenant', layer: 'structural', kind: 'api', label: '/api/admin/roles', attrs: {} });
      graph.addNode({ id: 'node_billing', layer: 'structural', kind: 'api', label: '/api/products2', attrs: {} });
      graph.addNode({ id: 'node_invoice', layer: 'structural', kind: 'api', label: '/api/checkout2', attrs: {} });
      graph.addNode({ id: 'node_ledger', layer: 'structural', kind: 'api', label: '/api/search2', attrs: {} });
      graph.addEdge({ from: 'node_tenant', to: 'node_billing', kind: 'navigation', weight: 1, evidence: ['e4'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_billing', to: 'node_invoice', kind: 'navigation', weight: 1, evidence: ['e5'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_billing', to: 'node_ledger', kind: 'navigation', weight: 1, evidence: ['e6'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const signatures = result.analysis.normalizedCorridorSignatures!;

      expect(signatures.length).toBeGreaterThanOrEqual(2);
      expect(signatures[0].canonicalIdentityKey).not.toBe(signatures[1].canonicalIdentityKey);
      expect(signatures[0].normalizedPrivilegeLineage).not.toEqual(signatures[1].normalizedPrivilegeLineage);
    });

    test('C) Different transition topology NEVER normalize together', () => {
      const graph = new ActionGraph();

      // Branch A: login -> products (AUTH -> RESOURCE)
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      // Branch B: login -> billing (AUTH -> PAYMENT)
      graph.addNode({ id: 'node_billing', layer: 'structural', kind: 'api', label: '/api/checkout2', attrs: {} });
      graph.addNode({ id: 'node_invoice', layer: 'structural', kind: 'api', label: '/api/invoice', attrs: {} });
      graph.addNode({ id: 'node_ledger', layer: 'structural', kind: 'api', label: '/api/ledger', attrs: {} });
      graph.addEdge({ from: 'node_login', to: 'node_billing', kind: 'navigation', weight: 1, evidence: ['e4'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_billing', to: 'node_invoice', kind: 'navigation', weight: 1, evidence: ['e5'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_billing', to: 'node_ledger', kind: 'navigation', weight: 1, evidence: ['e6'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const signatures = result.analysis.normalizedCorridorSignatures!;

      expect(signatures.length).toBeGreaterThanOrEqual(2);
      expect(signatures[0].canonicalIdentityKey).not.toBe(signatures[1].canonicalIdentityKey);
      expect(signatures[0].normalizedTransitionSequence).not.toEqual(signatures[1].normalizedTransitionSequence);
    });

    test('D) Repeated executions produce byte-identical normalization exports', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result1 = pipeline.run(graph);
      const result2 = pipeline.run(graph);

      expect(JSON.stringify(result1.analysis.normalizedCorridorSignatures))
        .toBe(JSON.stringify(result2.analysis.normalizedCorridorSignatures));
      expect(JSON.stringify(result1.analysis.canonicalCorridorReferenceIndex))
        .toBe(JSON.stringify(result2.analysis.canonicalCorridorReferenceIndex));
    });

    test('E) Normalization derives ONLY from sharedCorridors + canonicalCorridorIdentities', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const corridors = result.analysis.sharedCorridors!;
      const identities = result.analysis.canonicalCorridorIdentities!;
      const signatures = result.analysis.normalizedCorridorSignatures!;
      const refIndex = result.analysis.canonicalCorridorReferenceIndex!;

      // Verify that every normalization entry corresponds directly to derived corridors and identities
      expect(refIndex.references).toHaveLength(corridors.length);
      for (const ref of refIndex.references) {
        const matchingCorridor = corridors.find(c => c.corridorId === ref.corridorId);
        expect(matchingCorridor).toBeDefined();

        const matchingIdent = identities.find(i => i.corridorId === ref.corridorId);
        expect(matchingIdent).toBeDefined();
        expect(ref.canonicalIdentityKey).toBe(matchingIdent!.canonicalIdentityKey);

        const matchingSig = signatures.find(s => s.signatureId === ref.signatureId);
        expect(matchingSig).toBeDefined();
      }
    });

    test('F) No replay reconstruction drift', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const corridors = result.analysis.sharedCorridors!;
      const refs = result.analysis.compressedReachabilityRefs!;

      // Normalization layer MUST not cause any reconstruction drift or lineage loss
      for (const ref of refs) {
        const originalPath = result.analysis.paths.find(p => p.id === ref.pathId);
        expect(originalPath).toBeDefined();

        const corridor = corridors.find(c => c.corridorId === ref.sharedCorridorRefId);
        expect(corridor).toBeDefined();

        const reconstructed = [...corridor!.orderedEntitySequence, ...ref.remainingEntitySequence];
        expect(reconstructed).toEqual(originalPath!.entityIds);
      }
    });
  });

  test.describe('Semantic Ownership Stabilization', () => {
    test('1. Replay-independent identity stability', () => {
      const graph1 = new ActionGraph();
      graph1.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph1.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph1.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph1.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph1.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['evidence_1'], layer: 'behavioral' });
      graph1.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['evidence_2'], layer: 'behavioral' });
      graph1.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['evidence_3'], layer: 'behavioral' });

      const graph2 = new ActionGraph();
      graph2.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph2.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph2.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph2.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph2.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['different_ev_A'], layer: 'behavioral' });
      graph2.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['different_ev_B'], layer: 'behavioral' });
      graph2.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['different_ev_C'], layer: 'behavioral' });

      const result1 = pipeline.run(graph1);
      const result2 = pipeline.run(graph2);

      const sig1 = result1.analysis.semanticCorridorSignatures![0];
      const sig2 = result2.analysis.semanticCorridorSignatures![0];

      expect(sig1.semanticSignatureId).toBe('semcorr_000');
      expect(sig2.semanticSignatureId).toBe('semcorr_000');
      expect(sig1.normalizedEntitySignature).toBe(sig2.normalizedEntitySignature);
      expect(sig1.normalizedTransitionSignature).toBe(sig2.normalizedTransitionSignature);
      expect(sig1.normalizedBoundarySignature).toBe(sig2.normalizedBoundarySignature);
      expect(sig1.normalizedPrivilegeSignature).toBe(sig2.normalizedPrivilegeSignature);
    });

    test('2. Structural divergence isolation', () => {
      const graph = new ActionGraph();

      // Branch A
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      // Branch B (Different transition sequence / boundary structure)
      graph.addNode({ id: 'node_tenant', layer: 'structural', kind: 'api', label: '/api/admin/roles', attrs: {} });
      graph.addNode({ id: 'node_billing', layer: 'structural', kind: 'api', label: '/api/products2', attrs: {} });
      graph.addNode({ id: 'node_invoice', layer: 'structural', kind: 'api', label: '/api/checkout2', attrs: {} });
      graph.addNode({ id: 'node_ledger', layer: 'structural', kind: 'api', label: '/api/search2', attrs: {} });
      graph.addEdge({ from: 'node_tenant', to: 'node_billing', kind: 'navigation', weight: 1, evidence: ['e4'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_billing', to: 'node_invoice', kind: 'navigation', weight: 1, evidence: ['e5'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_billing', to: 'node_ledger', kind: 'navigation', weight: 1, evidence: ['e6'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const signatures = result.analysis.semanticCorridorSignatures!;

      expect(signatures.length).toBeGreaterThanOrEqual(2);
      expect(signatures[0].semanticSignatureId).toBe('semcorr_000');
      expect(signatures[1].semanticSignatureId).toBe('semcorr_001');
      expect(signatures[0].normalizedEntitySignature).not.toBe(signatures[1].normalizedEntitySignature);
    });

    test('3. Byte-identical determinism', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result1 = pipeline.run(graph);
      const result2 = pipeline.run(graph);

      expect(JSON.stringify(result1.analysis.semanticCorridorSignatures))
        .toBe(JSON.stringify(result2.analysis.semanticCorridorSignatures));
      expect(JSON.stringify(result1.analysis.semanticOwnershipIndex))
        .toBe(JSON.stringify(result2.analysis.semanticOwnershipIndex));
    });

    test('4. Reconstruction integrity preserved', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });

      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const corridors = result.analysis.sharedCorridors!;
      const refs = result.analysis.compressedReachabilityRefs!;

      for (const ref of refs) {
        const originalPath = result.analysis.paths.find(p => p.id === ref.pathId);
        expect(originalPath).toBeDefined();

        const corridor = corridors.find(c => c.corridorId === ref.sharedCorridorRefId);
        expect(corridor).toBeDefined();

        const reconstructed = [...corridor!.orderedEntitySequence, ...ref.remainingEntitySequence];
        expect(reconstructed).toEqual(originalPath!.entityIds);
      }
    });

    test('5. Structural ownership stability', () => {
      const graph = new ActionGraph();
      // Setup structurally equivalent branches that both generate corridors
      // Branch 1
      graph.addNode({ id: 'node_login', layer: 'structural', kind: 'api', label: '/api/auth/login', attrs: {} });
      graph.addNode({ id: 'node_products', layer: 'structural', kind: 'api', label: '/api/products', attrs: {} });
      graph.addNode({ id: 'node_checkout', layer: 'structural', kind: 'api', label: '/api/checkout', attrs: {} });
      graph.addNode({ id: 'node_search', layer: 'structural', kind: 'api', label: '/api/search', attrs: {} });
      graph.addEdge({ from: 'node_login', to: 'node_products', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_checkout', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_products', to: 'node_search', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      // Branch 2
      graph.addNode({ id: 'node_tenant', layer: 'structural', kind: 'api', label: '/api/admin/roles', attrs: {} });
      graph.addNode({ id: 'node_billing', layer: 'structural', kind: 'api', label: '/api/products2', attrs: {} });
      graph.addNode({ id: 'node_invoice', layer: 'structural', kind: 'api', label: '/api/checkout2', attrs: {} });
      graph.addNode({ id: 'node_ledger', layer: 'structural', kind: 'api', label: '/api/search2', attrs: {} });
      graph.addEdge({ from: 'node_tenant', to: 'node_billing', kind: 'navigation', weight: 1, evidence: ['e4'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_billing', to: 'node_invoice', kind: 'navigation', weight: 1, evidence: ['e5'], layer: 'behavioral' });
      graph.addEdge({ from: 'node_billing', to: 'node_ledger', kind: 'navigation', weight: 1, evidence: ['e6'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const index = result.analysis.semanticOwnershipIndex!;

      // Since the two branches are structurally distinct, they must map to distinct owners
      expect(index.semanticOwners.length).toBe(2);
      expect(index.semanticOwners[0].semanticSignatureId).not.toBe(index.semanticOwners[1].semanticSignatureId);
      
      // Each owner maps exactly to one distinct corridor ID
      expect(index.semanticOwners[0].corridorIds.length).toBe(1);
      expect(index.semanticOwners[1].corridorIds.length).toBe(1);
    });
  });

  test.describe('Deterministic Semantic Corridor Canonicalization (Safe Slice)', () => {
    test('1. Byte-identical output across consecutive runs', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'n1', layer: 'structural', kind: 'api', label: '/api/v1/a', attrs: {} });
      graph.addNode({ id: 'n2', layer: 'structural', kind: 'api', label: '/api/v1/b', attrs: {} });
      graph.addNode({ id: 'n3', layer: 'structural', kind: 'api', label: '/api/v1/c', attrs: {} });
      graph.addNode({ id: 'n4', layer: 'structural', kind: 'api', label: '/api/v1/d', attrs: {} });
      graph.addEdge({ from: 'n1', to: 'n2', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'n2', to: 'n3', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'n2', to: 'n4', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result1 = pipeline.run(graph);
      const result2 = pipeline.run(graph);

      expect(JSON.stringify(result1.analysis.semanticCorridorSignatures))
        .toBe(JSON.stringify(result2.analysis.semanticCorridorSignatures));
      expect(JSON.stringify(result1.analysis.semanticOwnershipIndex))
        .toBe(JSON.stringify(result2.analysis.semanticOwnershipIndex));
    });

    test('2. Semantic key generation stability', () => {
      const graph = new ActionGraph();
      graph.addNode({ id: 'n1', layer: 'structural', kind: 'api', label: '/api/v1/a', attrs: {} });
      graph.addNode({ id: 'n2', layer: 'structural', kind: 'api', label: '/api/v1/b', attrs: {} });
      graph.addNode({ id: 'n3', layer: 'structural', kind: 'api', label: '/api/v1/c', attrs: {} });
      graph.addNode({ id: 'n4', layer: 'structural', kind: 'api', label: '/api/v1/d', attrs: {} });
      graph.addEdge({ from: 'n1', to: 'n2', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'n2', to: 'n3', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'n2', to: 'n4', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const signature = result.analysis.semanticCorridorSignatures![0];

      expect(signature.normalizedEntitySignature).toBe('ENTITY:wf_ent_n1>wf_ent_n2');
      expect(signature.normalizedTransitionSignature).toBe('TRANSITION:/api/v1/a -> /api/v1/b');
      expect(signature.normalizedBoundarySignature).toBe('BOUNDARY:');
      expect(signature.normalizedPrivilegeSignature).toBe('PRIV:UNKNOWN>UNKNOWN');
    });

    test('3. Ownership grouping stability', () => {
      const graph = new ActionGraph();
      // Setup identical topologies
      graph.addNode({ id: 'n1', layer: 'structural', kind: 'api', label: '/api/v1/a', attrs: {} });
      graph.addNode({ id: 'n2', layer: 'structural', kind: 'api', label: '/api/v1/b', attrs: {} });
      graph.addNode({ id: 'n3', layer: 'structural', kind: 'api', label: '/api/v1/c', attrs: {} });
      graph.addNode({ id: 'n4', layer: 'structural', kind: 'api', label: '/api/v1/d', attrs: {} });
      graph.addEdge({ from: 'n1', to: 'n2', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph.addEdge({ from: 'n2', to: 'n3', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph.addEdge({ from: 'n2', to: 'n4', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const result = pipeline.run(graph);
      const index = result.analysis.semanticOwnershipIndex!;

      // Since they are identical, they group into a single semantic ownership mapping
      expect(index.semanticOwners.length).toBe(1);
      expect(index.semanticOwners[0].corridorIds.length).toBe(1);
    });

    test('4. Replay-independent canonicalization', () => {
      const graph1 = new ActionGraph();
      graph1.addNode({ id: 'n1', layer: 'structural', kind: 'api', label: '/api/v1/a', attrs: {} });
      graph1.addNode({ id: 'n2', layer: 'structural', kind: 'api', label: '/api/v1/b', attrs: {} });
      graph1.addNode({ id: 'n3', layer: 'structural', kind: 'api', label: '/api/v1/c', attrs: {} });
      graph1.addNode({ id: 'n4', layer: 'structural', kind: 'api', label: '/api/v1/d', attrs: {} });
      graph1.addEdge({ from: 'n1', to: 'n2', kind: 'navigation', weight: 1, evidence: ['replay_ev_1'], layer: 'behavioral' });
      graph1.addEdge({ from: 'n2', to: 'n3', kind: 'navigation', weight: 1, evidence: ['replay_ev_2'], layer: 'behavioral' });
      graph1.addEdge({ from: 'n2', to: 'n4', kind: 'navigation', weight: 1, evidence: ['replay_ev_3'], layer: 'behavioral' });

      const graph2 = new ActionGraph();
      graph2.addNode({ id: 'n1', layer: 'structural', kind: 'api', label: '/api/v1/a', attrs: {} });
      graph2.addNode({ id: 'n2', layer: 'structural', kind: 'api', label: '/api/v1/b', attrs: {} });
      graph2.addNode({ id: 'n3', layer: 'structural', kind: 'api', label: '/api/v1/c', attrs: {} });
      graph2.addNode({ id: 'n4', layer: 'structural', kind: 'api', label: '/api/v1/d', attrs: {} });
      graph2.addEdge({ from: 'n1', to: 'n2', kind: 'navigation', weight: 1, evidence: ['replay_ev_other_A'], layer: 'behavioral' });
      graph2.addEdge({ from: 'n2', to: 'n3', kind: 'navigation', weight: 1, evidence: ['replay_ev_other_B'], layer: 'behavioral' });
      graph2.addEdge({ from: 'n2', to: 'n4', kind: 'navigation', weight: 1, evidence: ['replay_ev_other_C'], layer: 'behavioral' });

      const result1 = pipeline.run(graph1);
      const result2 = pipeline.run(graph2);

      const sig1 = result1.analysis.semanticCorridorSignatures![0];
      const sig2 = result2.analysis.semanticCorridorSignatures![0];

      expect(sig1.normalizedEntitySignature).toBe(sig2.normalizedEntitySignature);
      expect(sig1.normalizedTransitionSignature).toBe(sig2.normalizedTransitionSignature);
      expect(sig1.normalizedBoundarySignature).toBe(sig2.normalizedBoundarySignature);
      expect(sig1.normalizedPrivilegeSignature).toBe(sig2.normalizedPrivilegeSignature);
    });

    test('5. Deterministic ordering under shuffled corridor insertion', () => {
      const graph1 = new ActionGraph();
      graph1.addNode({ id: 'n1', layer: 'structural', kind: 'api', label: '/api/v1/a', attrs: {} });
      graph1.addNode({ id: 'n2', layer: 'structural', kind: 'api', label: '/api/v1/b', attrs: {} });
      graph1.addNode({ id: 'n3', layer: 'structural', kind: 'api', label: '/api/v1/c', attrs: {} });
      graph1.addNode({ id: 'n4', layer: 'structural', kind: 'api', label: '/api/v1/d', attrs: {} });
      graph1.addEdge({ from: 'n1', to: 'n2', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph1.addEdge({ from: 'n2', to: 'n3', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });
      graph1.addEdge({ from: 'n2', to: 'n4', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });

      const graph2 = new ActionGraph();
      graph2.addNode({ id: 'n4', layer: 'structural', kind: 'api', label: '/api/v1/d', attrs: {} });
      graph2.addNode({ id: 'n3', layer: 'structural', kind: 'api', label: '/api/v1/c', attrs: {} });
      graph2.addNode({ id: 'n2', layer: 'structural', kind: 'api', label: '/api/v1/b', attrs: {} });
      graph2.addNode({ id: 'n1', layer: 'structural', kind: 'api', label: '/api/v1/a', attrs: {} });
      graph2.addEdge({ from: 'n2', to: 'n4', kind: 'navigation', weight: 1, evidence: ['e3'], layer: 'behavioral' });
      graph2.addEdge({ from: 'n1', to: 'n2', kind: 'navigation', weight: 1, evidence: ['e1'], layer: 'behavioral' });
      graph2.addEdge({ from: 'n2', to: 'n3', kind: 'navigation', weight: 1, evidence: ['e2'], layer: 'behavioral' });

      const result1 = pipeline.run(graph1);
      const result2 = pipeline.run(graph2);

      expect(JSON.stringify(result1.analysis.semanticCorridorSignatures))
        .toBe(JSON.stringify(result2.analysis.semanticCorridorSignatures));
      expect(JSON.stringify(result1.analysis.semanticOwnershipIndex))
        .toBe(JSON.stringify(result2.analysis.semanticOwnershipIndex));
    });
  });
});
