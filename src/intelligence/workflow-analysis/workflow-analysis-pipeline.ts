import { ActionGraph } from '../../graph/action-graph';
import { WorkflowDiscoveryEngine } from '../workflow-discovery/discovery-engine';
import { WorkflowEvaluator, WorkflowEvaluationResult } from './workflow-evaluator';
import { WorkflowAnalysisSummarizer, WorkflowAnalysisSummary } from './workflow-analysis-summary';
import { WorkflowAnalysisResult, WorkflowAnalysisBuilder } from './workflow-analysis-result';
import { WorkflowPathExtractor } from './workflow-path-extractor';
import { WorkflowEvidenceBuilder } from './workflow-evidence';
import { WorkflowRiskSignals as WorkflowRiskSignal } from '../workflow-models/workflow-risk-signals';

export interface WorkflowPipelineResult {
  analysis: WorkflowAnalysisResult;
  evaluation: WorkflowEvaluationResult;
  summary: WorkflowAnalysisSummary;
}

/**
 * WorkflowAnalysisPipeline
 * Cohesive, synchronous composition layer that drives the entire workflow intelligence flow.
 */
export class WorkflowAnalysisPipeline {
  constructor(
    private readonly discoveryEngine: WorkflowDiscoveryEngine,
    private readonly evaluator: WorkflowEvaluator,
    private readonly summarizer: WorkflowAnalysisSummarizer,
    private readonly pathExtractor: WorkflowPathExtractor,
    private readonly evidenceBuilder: WorkflowEvidenceBuilder,
    private readonly analysisBuilder: WorkflowAnalysisBuilder
  ) {}

  /**
   * Runs the workflow analysis pipeline deterministically against an ActionGraph.
   *
   * @param graph The raw target ActionGraph
   * @returns Deterministic aggregated pipeline output result
   */
  public run(graph: ActionGraph): WorkflowPipelineResult {
    const discoveryResult = this.discoveryEngine.discover(graph);

    // Extract paths deterministically
    const paths = this.pathExtractor.extractPaths(
      discoveryResult.entities,
      discoveryResult.transitions
    );

    // Build deterministic topology annotations
    const topologySignals: Required<WorkflowRiskSignal>['topologySignals'] = [];

    for (const path of paths) {
      if (path.entityIds.length < 2) continue;

      const firstEntityId = path.entityIds[0];
      const lastEntityId = path.entityIds[path.entityIds.length - 1];

      const firstEntity = discoveryResult.entities.find(e => e.id === firstEntityId);
      const lastEntity = discoveryResult.entities.find(e => e.id === lastEntityId);

      if (firstEntity && lastEntity) {
        // 1. PRIVILEGE_AMPLIFICATION_PATH: Non-privileged start, Admin end
        if (firstEntity.category !== 'ADMIN' && lastEntity.category === 'ADMIN') {
          topologySignals.push({
            type: 'PRIVILEGE_AMPLIFICATION_PATH',
            pathId: path.id,
            evidenceLinks: [`entity:${firstEntity.id}`, `entity:${lastEntity.id}`]
          });
        }
      }

      // 2. MULTI_BOUNDARY_ESCALATION: Touches more than one boundary
      const touchedBoundaries = discoveryResult.boundaries.filter(b =>
        b.entityIds.some(eId => path.entityIds.includes(eId))
      );
      if (touchedBoundaries.length > 1) {
        topologySignals.push({
          type: 'MULTI_BOUNDARY_ESCALATION',
          pathId: path.id,
          evidenceLinks: touchedBoundaries.map(b => `boundary:${b.id}`)
        });
      }

      // 3. ROLE_CHAIN_ESCALATION: Direct transition into Admin node
      for (let i = 0; i < path.entityIds.length - 1; i++) {
        const current = discoveryResult.entities.find(e => e.id === path.entityIds[i]);
        const next = discoveryResult.entities.find(e => e.id === path.entityIds[i + 1]);

        if (current && next && current.category !== 'ADMIN' && next.category === 'ADMIN') {
          topologySignals.push({
            type: 'ROLE_CHAIN_ESCALATION',
            pathId: path.id,
            evidenceLinks: [`entity:${current.id}`, `entity:${next.id}`]
          });
        }
      }
    }

    const riskSignals: WorkflowRiskSignal[] = [
      {
        ...discoveryResult.riskSignals,
        topologySignals
      }
    ];

    // Build evidence structures preserving sequence order
    const evidence = paths.map(path => {
      const boundaryIds = discoveryResult.boundaries
        .filter(b => b.entityIds.some(eId => path.entityIds.includes(eId)))
        .map(b => b.id);

      const triggeredRules = discoveryResult.riskSignals.triggeredRuleIds ?? [];

      const sourceNodeIds = discoveryResult.entities
        .filter(e => path.entityIds.includes(e.id))
        .flatMap(e => e.sourceNodeIds);

      return this.evidenceBuilder.build(
        path.id,
        path.entityIds,
        boundaryIds,
        triggeredRules,
        sourceNodeIds
      );
    });

    // Synthesize the final, immutable analysis outcome package
    const analysis = this.analysisBuilder.build(
      paths,
      discoveryResult.entities,
      discoveryResult.boundaries,
      riskSignals,
      evidence
    );

    const evaluation = this.evaluator.evaluate(analysis);
    const summary = this.summarizer.summarize(analysis, evaluation);

    return {
      analysis,
      evaluation,
      summary
    };
  }
}
