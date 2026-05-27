import { ActionGraph } from '../../graph/action-graph';
import { WorkflowDiscoveryEngine } from '../workflow-discovery/discovery-engine';
import { WorkflowEvaluator, WorkflowEvaluationResult } from './workflow-evaluator';
import { WorkflowAnalysisSummarizer, WorkflowAnalysisSummary } from './workflow-analysis-summary';
import { WorkflowAnalysisResult, WorkflowAnalysisBuilder, ExploitEvidencePackage, InvestigationViews, ReplayTraceSummary } from './workflow-analysis-result';
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

    // Build deterministic comparative signals
    const comparativeSignals: Required<WorkflowRiskSignal>['comparativeSignals'] = [];

    // Rule 1: UNEXPECTED_PRIVILEGED_REACHABILITY - any path starting with AUTH/UNKNOWN reaching ADMIN
    for (const path of paths) {
      if (path.entityIds.length < 2) continue;
      const firstId = path.entityIds[0];
      const lastId = path.entityIds[path.entityIds.length - 1];

      const first = discoveryResult.entities.find(e => e.id === firstId);
      const last = discoveryResult.entities.find(e => e.id === lastId);

      if (first && last && first.category !== 'ADMIN' && last.category === 'ADMIN') {
        comparativeSignals.push({
          type: 'UNEXPECTED_PRIVILEGED_REACHABILITY',
          evidenceLinks: [`path:${path.id}`, `entity:${last.id}`]
        });
      }
    }

    // Rule 2: TRUST_BOUNDARY_INCONSISTENCY - when a boundary contains multiple categories
    for (const boundary of discoveryResult.boundaries) {
      const boundaryEntities = discoveryResult.entities.filter(e => boundary.entityIds.includes(e.id));
      const categories = new Set(boundaryEntities.map(e => e.category));
      if (categories.size > 1) {
        comparativeSignals.push({
          type: 'TRUST_BOUNDARY_INCONSISTENCY',
          evidenceLinks: [`boundary:${boundary.id}`, ...boundaryEntities.map(e => `entity:${e.id}`)]
        });
      }
    }

    // Build deterministic structural anomaly signals
    const anomalySignals: Required<WorkflowRiskSignal>['anomalySignals'] = [];

    // Rule 1: STRUCTURAL_WORKFLOW_BYPASS - direct jump from PAYMENT/RESOURCE to ADMIN
    for (const path of paths) {
      for (let i = 0; i < path.entityIds.length - 1; i++) {
        const curr = discoveryResult.entities.find(e => e.id === path.entityIds[i]);
        const next = discoveryResult.entities.find(e => e.id === path.entityIds[i+1]);
        if (curr && next && (curr.category === 'PAYMENT' || curr.category === 'RESOURCE') && next.category === 'ADMIN') {
          anomalySignals.push({
            type: 'STRUCTURAL_WORKFLOW_BYPASS',
            evidenceLinks: [`path:${path.id}`, `entity:${curr.id}`, `entity:${next.id}`]
          });
        }
      }
    }

    // Rule 2: UNIQUE_TRUST_COLLAPSE - Role boundary encompassing Auth node without environment segregation
    const roleBoundary = discoveryResult.boundaries.find(b => b.id === 'wf_bnd_role');
    if (roleBoundary && roleBoundary.entityIds.some(eId => {
      const ent = discoveryResult.entities.find(e => e.id === eId);
      return ent?.category === 'AUTH';
    })) {
      anomalySignals.push({
        type: 'UNIQUE_TRUST_COLLAPSE',
        evidenceLinks: [`boundary:${roleBoundary.id}`]
      });
    }

    const riskSignals: WorkflowRiskSignal[] = [
      {
        ...discoveryResult.riskSignals,
        topologySignals,
        comparativeSignals,
        anomalySignals
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

    // Build deterministic exploit evidence packages
    const topologySummary = `Topology Summary: Identified ${topologySignals.length} path topology patterns. Patterns: ${topologySignals.map(s => s.type).join(', ')}.`;
    const anomalySummary = `Anomaly Summary: Identified ${anomalySignals.length} structural anomaly patterns. Patterns: ${anomalySignals.map(s => s.type).join(', ')}.`;
    const asymmetrySummary = `Asymmetry Summary: Identified ${comparativeSignals.length} authorization asymmetry patterns. Patterns: ${comparativeSignals.map(s => s.type).join(', ')}.`;
    const trustBoundarySummary = `Trust Boundary Summary: Traced ${discoveryResult.boundaries.length} boundary contexts. Boundaries: ${discoveryResult.boundaries.map(b => b.id).join(', ')}.`;

    const allEvidenceLinks = Array.from(new Set([
      ...discoveryResult.riskSignals.exploitSignals?.flatMap(s => s.evidenceLinks) ?? [],
      ...topologySignals.flatMap(s => s.evidenceLinks),
      ...comparativeSignals.flatMap(s => s.evidenceLinks),
      ...anomalySignals.flatMap(s => s.evidenceLinks)
    ])).sort();

    const affectedEntities = Array.from(new Set(
      discoveryResult.entities.map(e => e.id)
    )).sort();

    const replayLinkedIdentifiers = Array.from(new Set([
      ...paths.map(p => p.id),
      ...discoveryResult.boundaries.map(b => b.id)
    ])).sort();

    const exploitEvidencePackage: ExploitEvidencePackage = {
      topologySummary,
      anomalySummary,
      asymmetrySummary,
      trustBoundarySummary,
      evidenceLinks: allEvidenceLinks,
      affectedEntities,
      replayLinkedIdentifiers
    };

    // Build deterministic investigation organization views
    const byTrustBoundary: Record<string, string[]> = {};
    for (const boundary of discoveryResult.boundaries) {
      byTrustBoundary[boundary.id] = [...boundary.entityIds].sort();
    }

    const byAffectedEntity: Record<string, string[]> = {};
    for (const entity of discoveryResult.entities) {
      byAffectedEntity[entity.id] = paths
        .filter(p => p.entityIds.includes(entity.id))
        .map(p => `path:${p.id}`)
        .sort();
    }

    const byAsymmetryType: Record<string, string[]> = {};
    for (const signal of comparativeSignals) {
      if (!byAsymmetryType[signal.type]) {
        byAsymmetryType[signal.type] = [];
      }
      byAsymmetryType[signal.type].push(...signal.evidenceLinks.filter(l => l.startsWith('boundary:') || l.startsWith('path:')));
      byAsymmetryType[signal.type] = Array.from(new Set(byAsymmetryType[signal.type])).sort();
    }

    const byTopologyAnomaly: Record<string, string[]> = {};
    for (const signal of anomalySignals) {
      if (!byTopologyAnomaly[signal.type]) {
        byTopologyAnomaly[signal.type] = [];
      }
      byTopologyAnomaly[signal.type].push(...signal.evidenceLinks.filter(l => l.startsWith('boundary:') || l.startsWith('path:')));
      byTopologyAnomaly[signal.type] = Array.from(new Set(byTopologyAnomaly[signal.type])).sort();
    }

    const byPrivilegeTransition: Record<string, string[]> = {};
    for (const signal of topologySignals) {
      if (!byPrivilegeTransition[signal.type]) {
        byPrivilegeTransition[signal.type] = [];
      }
      byPrivilegeTransition[signal.type].push(`path:${signal.pathId}`);
      byPrivilegeTransition[signal.type] = Array.from(new Set(byPrivilegeTransition[signal.type])).sort();
    }

    const investigationViews: InvestigationViews = {
      byTrustBoundary,
      byAffectedEntity,
      byAsymmetryType,
      byTopologyAnomaly,
      byPrivilegeTransition
    };

    // Build deterministic replay trace summaries
    const replayTraceSummaries: ReplayTraceSummary[] = [];

    for (const path of paths) {
      const orderedReplayTrace: string[] = [];
      const orderedBoundarySequence: string[] = [];
      const orderedRoleTransitionSequence: string[] = [];
      const orderedWorkflowTransitionSequence: string[] = [];

      for (let i = 0; i < path.entityIds.length; i++) {
        const entId = path.entityIds[i];
        const entity = discoveryResult.entities.find(e => e.id === entId);
        if (entity) {
          orderedReplayTrace.push(entity.name);
          orderedRoleTransitionSequence.push(entity.category);
        }

        const boundary = discoveryResult.boundaries.find(b => b.entityIds.includes(entId));
        if (boundary && !orderedBoundarySequence.includes(boundary.id)) {
          orderedBoundarySequence.push(boundary.id);
        }

        if (i < path.entityIds.length - 1) {
          const nextEntId = path.entityIds[i + 1];
          const nextEntity = discoveryResult.entities.find(e => e.id === nextEntId);
          if (entity && nextEntity) {
            orderedWorkflowTransitionSequence.push(`${entity.name} -> ${nextEntity.name}`);
          }
        }
      }

      replayTraceSummaries.push({
        orderedReplayTrace,
        orderedBoundarySequence,
        orderedRoleTransitionSequence,
        orderedWorkflowTransitionSequence
      });
    }

    // Synthesize the final, immutable analysis outcome package
    const analysis = this.analysisBuilder.build(
      paths,
      discoveryResult.entities,
      discoveryResult.boundaries,
      riskSignals,
      evidence,
      exploitEvidencePackage,
      investigationViews,
      replayTraceSummaries
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
