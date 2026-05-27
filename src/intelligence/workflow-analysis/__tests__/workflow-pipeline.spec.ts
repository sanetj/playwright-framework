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
        ],
        topologySignals: [
          {
            type: 'PRIVILEGE_AMPLIFICATION_PATH',
            pathId: 'path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles',
            evidenceLinks: ['entity:wf_ent_node_login', 'entity:wf_ent_node_roles']
          },
          {
            type: 'ROLE_CHAIN_ESCALATION',
            pathId: 'path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles',
            evidenceLinks: ['entity:wf_ent_node_checkout', 'entity:wf_ent_node_roles']
          }
        ],
        comparativeSignals: [
          {
            type: 'UNEXPECTED_PRIVILEGED_REACHABILITY',
            evidenceLinks: [
              'path:path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles',
              'entity:wf_ent_node_roles'
            ]
          },
          {
            type: 'TRUST_BOUNDARY_INCONSISTENCY',
            evidenceLinks: [
              'boundary:wf_bnd_role',
              'entity:wf_ent_node_login',
              'entity:wf_ent_node_roles'
            ]
          }
        ],
        anomalySignals: [
          {
            type: 'STRUCTURAL_WORKFLOW_BYPASS',
            evidenceLinks: [
              'path:path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles',
              'entity:wf_ent_node_checkout',
              'entity:wf_ent_node_roles'
            ]
          },
          {
            type: 'UNIQUE_TRUST_COLLAPSE',
            evidenceLinks: [
              'boundary:wf_bnd_role'
            ]
          }
        ]
      }
    ]);

    expect(result.analysis.exploitEvidencePackage).toEqual({
      topologySummary: 'Topology Summary: Identified 2 path topology patterns. Patterns: PRIVILEGE_AMPLIFICATION_PATH, ROLE_CHAIN_ESCALATION.',
      anomalySummary: 'Anomaly Summary: Identified 2 structural anomaly patterns. Patterns: STRUCTURAL_WORKFLOW_BYPASS, UNIQUE_TRUST_COLLAPSE.',
      asymmetrySummary: 'Asymmetry Summary: Identified 2 authorization asymmetry patterns. Patterns: UNEXPECTED_PRIVILEGED_REACHABILITY, TRUST_BOUNDARY_INCONSISTENCY.',
      trustBoundarySummary: 'Trust Boundary Summary: Traced 1 boundary contexts. Boundaries: wf_bnd_role.',
      evidenceLinks: [
        'boundary:wf_bnd_role',
        'entity:wf_ent_node_checkout',
        'entity:wf_ent_node_login',
        'entity:wf_ent_node_roles',
        'path:path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles'
      ],
      affectedEntities: [
        'wf_ent_node_checkout',
        'wf_ent_node_login',
        'wf_ent_node_products',
        'wf_ent_node_roles'
      ],
      replayLinkedIdentifiers: [
        'path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles',
        'wf_bnd_role'
      ]
    });

    expect(result.analysis.investigationViews).toEqual({
      byTrustBoundary: {
        wf_bnd_role: ['wf_ent_node_login', 'wf_ent_node_roles']
      },
      byAffectedEntity: {
        wf_ent_node_login: ['path:path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles'],
        wf_ent_node_products: ['path:path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles'],
        wf_ent_node_checkout: ['path:path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles'],
        wf_ent_node_roles: ['path:path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles']
      },
      byAsymmetryType: {
        UNEXPECTED_PRIVILEGED_REACHABILITY: ['path:path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles'],
        TRUST_BOUNDARY_INCONSISTENCY: ['boundary:wf_bnd_role']
      },
      byTopologyAnomaly: {
        STRUCTURAL_WORKFLOW_BYPASS: ['path:path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles'],
        UNIQUE_TRUST_COLLAPSE: ['boundary:wf_bnd_role']
      },
      byPrivilegeTransition: {
        PRIVILEGE_AMPLIFICATION_PATH: ['path:path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles'],
        ROLE_CHAIN_ESCALATION: ['path:path_wf_ent_node_login_wf_ent_node_products_wf_ent_node_checkout_wf_ent_node_roles']
      }
    });

    expect(result.analysis.replayTraceSummaries).toEqual([
      {
        orderedReplayTrace: [
          '/api/auth/login',
          '/api/products',
          '/api/checkout',
          '/api/roles'
        ],
        orderedBoundarySequence: [
          'wf_bnd_role'
        ],
        orderedRoleTransitionSequence: [
          'AUTH',
          'RESOURCE',
          'PAYMENT',
          'ADMIN'
        ],
        orderedWorkflowTransitionSequence: [
          '/api/auth/login -> /api/products',
          '/api/products -> /api/checkout',
          '/api/checkout -> /api/roles'
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
