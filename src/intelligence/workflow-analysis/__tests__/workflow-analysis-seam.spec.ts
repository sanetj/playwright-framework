import { test, expect } from '@playwright/test';
import { createGoldenActionGraph } from '../__fixtures__/golden-action-graph';
import { runDeterministicAnalysis } from '../workflow-analysis-seam';
import { WorkflowDiscoveryEngine } from '../../workflow-discovery/discovery-engine';
import { WorkflowEvaluator } from '../workflow-evaluator';
import { WorkflowAnalysisSummarizer } from '../workflow-analysis-summary';
import { WorkflowPathExtractor } from '../workflow-path-extractor';
import { WorkflowEvidenceBuilder } from '../workflow-evidence';
import { WorkflowAnalysisBuilder } from '../workflow-analysis-result';
import { WorkflowAnalysisPipeline } from '../workflow-analysis-pipeline';

test.describe('Deterministic Analysis Seam Verification', () => {
  test('seam output must be byte-identical to direct pipeline construction', () => {
    const graph = createGoldenActionGraph();

    // 1. Direct pipeline construction (baseline)
    const directPipeline = new WorkflowAnalysisPipeline(
      new WorkflowDiscoveryEngine(),
      new WorkflowEvaluator(),
      new WorkflowAnalysisSummarizer(),
      new WorkflowPathExtractor(),
      new WorkflowEvidenceBuilder(),
      new WorkflowAnalysisBuilder()
    );
    const directResult = directPipeline.run(graph);

    // 2. Seam invocation
    const seamResult = runDeterministicAnalysis(graph);

    // 3. Assert byte-identical outputs
    expect(JSON.stringify(seamResult)).toBe(JSON.stringify(directResult));
  });

  test('seam preserves all frozen export contract invariants', () => {
    const graph = createGoldenActionGraph();
    const result = runDeterministicAnalysis(graph);

    // Schema versioning
    expect(result.analysis.exportContractVersion).toBe('1.0.0');
    expect(result.analysis.cognitionSchemaVersion).toBe('1.0.0');

    // Deterministic path output
    expect(result.analysis.paths).toHaveLength(1);
    expect(result.analysis.paths[0].id).toBe(
      'path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles'
    );

    // Evidence package integrity
    const pkg = result.analysis.exploitEvidencePackage;
    expect(pkg).toBeDefined();
    expect(pkg?.packageId).toBe(
      'pkg_path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles'
    );

    // Replay trace integrity
    const trace = result.analysis.replayTraceSummaries?.[0];
    expect(trace).toBeDefined();
    expect(trace?.pathId).toBe(pkg?.pathIds?.[0]);

    // Cross-reference integrity
    const enrichedViews = result.analysis.investigationViews?.enrichedViews;
    expect(enrichedViews).toBeDefined();
    const viewItem = enrichedViews?.byAffectedEntity['wf_ent_node_login']?.[0];
    expect(viewItem?.evidencePackageId).toBe(pkg?.packageId);
  });

  test('seam is stateless — consecutive calls produce identical results', () => {
    const graph = createGoldenActionGraph();

    const result1 = runDeterministicAnalysis(graph);
    const result2 = runDeterministicAnalysis(graph);

    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  test('seam summary matches expected golden values', () => {
    const graph = createGoldenActionGraph();
    const result = runDeterministicAnalysis(graph);

    expect(result.summary).toEqual({
      totalPaths: 1,
      totalEntities: 4,
      totalBoundaries: 1,
      totalRiskSignals: 1,
      suspicious: true
    });
  });

  test('seam returns a deep-frozen immutable result', () => {
    const graph = createGoldenActionGraph();
    const result = runDeterministicAnalysis(graph);

    // Verify root object is frozen
    expect(Object.isFrozen(result)).toBe(true);

    // Verify nested objects are frozen
    expect(Object.isFrozen(result.analysis)).toBe(true);
    expect(Object.isFrozen(result.analysis.exploitEvidencePackage)).toBe(true);
    expect(Object.isFrozen(result.analysis.investigationViews)).toBe(true);
    expect(Object.isFrozen(result.analysis.replayTraceSummaries)).toBe(true);
    expect(Object.isFrozen(result.summary)).toBe(true);
    expect(Object.isFrozen(result.evaluation)).toBe(true);

    // Verify mutations on primitive properties throw errors (strict mode)
    expect(() => {
      (result as any).summary = {} as any;
    }).toThrow();

    expect(() => {
      (result.analysis as any).exportContractVersion = 'mutated';
    }).toThrow();

    expect(() => {
      (result.analysis.exploitEvidencePackage as any).packageId = 'mutated';
    }).toThrow();

    // Verify push/mutation on arrays throws errors
    expect(() => {
      (result.analysis.paths as any).push({} as any);
    }).toThrow();
  });
});

