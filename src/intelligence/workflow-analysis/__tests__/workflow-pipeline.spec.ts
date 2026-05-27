import { test, expect } from '@playwright/test';
import { createGoldenActionGraph } from '../__fixtures__/golden-action-graph';
import { WorkflowDiscoveryEngine } from '../../workflow-discovery/discovery-engine';
import { WorkflowEvaluator } from '../workflow-evaluator';
import { WorkflowAnalysisSummarizer } from '../workflow-analysis-summary';
import { WorkflowPathExtractor } from '../workflow-path-extractor';
import { WorkflowEvidenceBuilder } from '../workflow-evidence';
import { WorkflowAnalysisBuilder } from '../workflow-analysis-result';
import { WorkflowAnalysisPipeline } from '../workflow-analysis-pipeline';

test.describe('WorkflowAnalysisPipeline Golden Fixture Verification', () => {
  test('should run deterministic workflow analysis pipeline on golden action graph', () => {
    // 1. Arrange: instantiate pure dependencies
    const discoveryEngine = new WorkflowDiscoveryEngine();
    const evaluator = new WorkflowEvaluator();
    const summarizer = new WorkflowAnalysisSummarizer();
    const pathExtractor = new WorkflowPathExtractor();
    const evidenceBuilder = new WorkflowEvidenceBuilder();
    const analysisBuilder = new WorkflowAnalysisBuilder();

    const pipeline = new WorkflowAnalysisPipeline(
      discoveryEngine,
      evaluator,
      summarizer,
      pathExtractor,
      evidenceBuilder,
      analysisBuilder
    );

    const graph = createGoldenActionGraph();

    // 2. Act: run the pipeline
    const result = pipeline.run(graph);

    // 3. Assert: verify deterministic value objects
    expect(result.summary).toEqual({
      totalPaths: 1,
      totalEntities: 4,
      totalBoundaries: 1,
      totalRiskSignals: 1,
      suspicious: true
    });

    expect(result.evaluation).toEqual({
      suspicious: true,
      triggeredSignals: []
    });

    expect(result.analysis.paths).toHaveLength(1);
    const path = result.analysis.paths[0];
    expect(path.id).toBe('path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles');
    expect(path.entityIds).toEqual([
      'wf_ent_node_login',
      'wf_ent_node_products',
      'wf_ent_node_checkout',
      'wf_ent_node_roles'
    ]);

    expect(result.analysis.boundaries).toEqual([
      {
        id: 'wf_bnd_role',
        boundaryType: 'ROLE',
        entityIds: ['wf_ent_node_login', 'wf_ent_node_roles']
      }
    ]);

    expect(result.analysis.riskSignals).toEqual([
      {
        crossesBoundary: true,
        containsAdminEntity: true,
        containsTenantBoundary: false,
        containsAuthEntity: true,
        containsExternalEntity: false,
        exploitSignals: [
          {
            type: 'CROSS_ROLE_TRANSITION',
            evidenceLinks: ['entity:wf_ent_node_login', 'entity:wf_ent_node_roles']
          },
          {
            type: 'TRUST_BOUNDARY_CROSSING',
            evidenceLinks: ['boundary:wf_bnd_role']
          }
        ]
      }
    ]);

    expect(result.analysis.evidence).toHaveLength(1);
    const evidence = result.analysis.evidence[0];
    expect(evidence.pathId).toBe(path.id);
    expect(evidence.entityIds).toEqual(path.entityIds);
    expect(evidence.boundaryIds).toEqual(['wf_bnd_role']);
    expect(evidence.riskSignals).toEqual([]);
    expect(evidence.sourceNodeIds).toEqual([
      'node_login',
      'node_products',
      'node_checkout',
      'node_roles'
    ]);
  });
});
