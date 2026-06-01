import { ActionGraph } from '../../graph/action-graph';
import { WorkflowDiscoveryEngine } from '../workflow-discovery/discovery-engine';
import { WorkflowEvaluator, WorkflowEvaluationResult } from './workflow-evaluator';
import { WorkflowAnalysisSummarizer, WorkflowAnalysisSummary } from './workflow-analysis-summary';
import { WorkflowPathExtractor } from './workflow-path-extractor';
import { WorkflowEvidenceBuilder } from './workflow-evidence';
import { WorkflowRiskSignals as WorkflowRiskSignal } from '../workflow-models/workflow-risk-signals';
import {
  WorkflowAnalysisResult,
  WorkflowAnalysisBuilder,
  ExploitEvidencePackage,
  InvestigationViews,
  ReplayTraceSummary,
  EnrichedWorkflowEntity,
  EnrichedWorkflowBoundary,
  EnrichedInvestigationViewItem,
  EnrichedInvestigationViews,
  ContradictionSignal,
  StructuralContradictionGroup,
  SharedLineageSegment,
  CompressedContradictionLineage,
  SharedReachabilityCorridor,
  CompressedReachabilityReference,
  CorridorIntersectionNode,
  CorridorIntersectionIndex,
  CanonicalCorridorIdentity,
  NormalizedCorridorSignature,
  CanonicalCorridorReferenceIndex,
  SemanticCorridorSignature,
  SemanticOwnershipIndex,
  DifferentialSemanticDivergence,
  CanonicalIsolationSignature,
  ReconstructionLineageReference,
  DeterministicReconstructionIndex
} from './workflow-analysis-result';

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

    // Enrich entities and boundaries with human-readable aliases
    const enrichedEntities = discoveryResult.entities.map(e => ({
      ...e,
      alias: getEntityAlias(e.name, e.category)
    }));

    const enrichedBoundaries = discoveryResult.boundaries.map(b => ({
      ...b,
      alias: getBoundaryAlias(b.id, b.boundaryType)
    }));

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

    const packageId = `pkg_${paths.map(p => p.id).join('_')}`;
    const pathIds = paths.map(p => p.id);

    const exploitEvidencePackage: ExploitEvidencePackage = {
      packageId,
      pathIds,
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

      // Alias of the trace journey
      const pathEntities = path.entityIds.map(entId => {
        const ent = discoveryResult.entities.find(e => e.id === entId);
        return ent ? getEntityAlias(ent.name, ent.category).split(' [')[0] : entId;
      });
      const alias = `${pathEntities.join(' -> ')} Flow`;

      const firstEnt = discoveryResult.entities.find(e => e.id === path.entityIds[0]);
      const lastEnt = discoveryResult.entities.find(e => e.id === path.entityIds[path.entityIds.length - 1]);

      const sourcePrivilegeContext = firstEnt ? getPrivilegeContextSummary(firstEnt.category) : 'Generic application entrypoint';
      const targetPrivilegeContext = lastEnt ? getPrivilegeContextSummary(lastEnt.category) : 'Generic application endpoint';

      replayTraceSummaries.push({
        pathId: path.id,
        alias,
        orderedReplayTrace,
        orderedBoundarySequence,
        orderedRoleTransitionSequence,
        orderedWorkflowTransitionSequence,
        sourcePrivilegeContext,
        targetPrivilegeContext
      });
    }

    // Build enriched views containing direct references, aliases, and trace summaries
    const enrichedByTrustBoundary: Record<string, EnrichedInvestigationViewItem[]> = {};
    for (const boundary of discoveryResult.boundaries) {
      enrichedByTrustBoundary[boundary.id] = boundary.entityIds.map(entId => {
        const entity = discoveryResult.entities.find(e => e.id === entId);
        const entityName = entity ? entity.name : entId;
        const entityCat = entity ? entity.category : 'UNKNOWN';
        const entityAlias = getEntityAlias(entityName, entityCat);
        return {
          referenceId: entId,
          alias: entityAlias
        };
      });
    }

    const enrichedByAffectedEntity: Record<string, EnrichedInvestigationViewItem[]> = {};
    for (const entity of discoveryResult.entities) {
      const pathsForEntity = paths.filter(p => p.entityIds.includes(entity.id));
      enrichedByAffectedEntity[entity.id] = pathsForEntity.map(p => {
        const trace = replayTraceSummaries.find(t => t.pathId === p.id);
        return {
          referenceId: p.id,
          alias: trace ? trace.alias : p.id,
          replayTrace: trace,
          evidencePackageId: exploitEvidencePackage.packageId,
          topologySummary: exploitEvidencePackage.topologySummary
        };
      });
    }

    const enrichedByAsymmetryType: Record<string, EnrichedInvestigationViewItem[]> = {};
    for (const signal of comparativeSignals) {
      if (!enrichedByAsymmetryType[signal.type]) {
        enrichedByAsymmetryType[signal.type] = [];
      }
      const links = signal.evidenceLinks.filter(l => l.startsWith('boundary:') || l.startsWith('path:'));
      for (const link of links) {
        const [kind, id] = link.split(':');
        if (kind === 'path') {
          const trace = replayTraceSummaries.find(t => t.pathId === id);
          enrichedByAsymmetryType[signal.type].push({
            referenceId: id,
            alias: trace ? trace.alias : id,
            replayTrace: trace,
            evidencePackageId: exploitEvidencePackage.packageId,
            topologySummary: exploitEvidencePackage.topologySummary
          });
        } else if (kind === 'boundary') {
          const boundary = discoveryResult.boundaries.find(b => b.id === id);
          const boundaryAlias = boundary ? getBoundaryAlias(boundary.id, boundary.boundaryType) : id;
          enrichedByAsymmetryType[signal.type].push({
            referenceId: id,
            alias: boundaryAlias,
            evidencePackageId: exploitEvidencePackage.packageId,
            topologySummary: exploitEvidencePackage.topologySummary
          });
        }
      }
      const seen = new Set<string>();
      enrichedByAsymmetryType[signal.type] = enrichedByAsymmetryType[signal.type].filter(item => {
        if (seen.has(item.referenceId)) return false;
        seen.add(item.referenceId);
        return true;
      }).sort((a, b) => a.referenceId.localeCompare(b.referenceId));
    }

    const enrichedByTopologyAnomaly: Record<string, EnrichedInvestigationViewItem[]> = {};
    for (const signal of anomalySignals) {
      if (!enrichedByTopologyAnomaly[signal.type]) {
        enrichedByTopologyAnomaly[signal.type] = [];
      }
      const links = signal.evidenceLinks.filter(l => l.startsWith('boundary:') || l.startsWith('path:'));
      for (const link of links) {
        const [kind, id] = link.split(':');
        if (kind === 'path') {
          const trace = replayTraceSummaries.find(t => t.pathId === id);
          enrichedByTopologyAnomaly[signal.type].push({
            referenceId: id,
            alias: trace ? trace.alias : id,
            replayTrace: trace,
            evidencePackageId: exploitEvidencePackage.packageId,
            topologySummary: exploitEvidencePackage.topologySummary
          });
        } else if (kind === 'boundary') {
          const boundary = discoveryResult.boundaries.find(b => b.id === id);
          const boundaryAlias = boundary ? getBoundaryAlias(boundary.id, boundary.boundaryType) : id;
          enrichedByTopologyAnomaly[signal.type].push({
            referenceId: id,
            alias: boundaryAlias,
            evidencePackageId: exploitEvidencePackage.packageId,
            topologySummary: exploitEvidencePackage.topologySummary
          });
        }
      }
      const seen = new Set<string>();
      enrichedByTopologyAnomaly[signal.type] = enrichedByTopologyAnomaly[signal.type].filter(item => {
        if (seen.has(item.referenceId)) return false;
        seen.add(item.referenceId);
        return true;
      }).sort((a, b) => a.referenceId.localeCompare(b.referenceId));
    }

    const enrichedByPrivilegeTransition: Record<string, EnrichedInvestigationViewItem[]> = {};
    for (const signal of topologySignals) {
      if (!enrichedByPrivilegeTransition[signal.type]) {
        enrichedByPrivilegeTransition[signal.type] = [];
      }
      const trace = replayTraceSummaries.find(t => t.pathId === signal.pathId);
      enrichedByPrivilegeTransition[signal.type].push({
        referenceId: signal.pathId,
        alias: trace ? trace.alias : signal.pathId,
        replayTrace: trace,
        evidencePackageId: exploitEvidencePackage.packageId,
        topologySummary: exploitEvidencePackage.topologySummary
      });
      const seen = new Set<string>();
      enrichedByPrivilegeTransition[signal.type] = enrichedByPrivilegeTransition[signal.type].filter(item => {
        if (seen.has(item.referenceId)) return false;
        seen.add(item.referenceId);
        return true;
      }).sort((a, b) => a.referenceId.localeCompare(b.referenceId));
    }

    const investigationViews: InvestigationViews = {
      byTrustBoundary,
      byAffectedEntity,
      byAsymmetryType,
      byTopologyAnomaly,
      byPrivilegeTransition,
      enrichedViews: {
        byTrustBoundary: enrichedByTrustBoundary,
        byAffectedEntity: enrichedByAffectedEntity,
        byAsymmetryType: enrichedByAsymmetryType,
        byTopologyAnomaly: enrichedByTopologyAnomaly,
        byPrivilegeTransition: enrichedByPrivilegeTransition
      }
    };

    // Deterministically categorize risk signals into structural contradiction groups
    const contradictionGroups: Record<'TOPOLOGY_ANOMALY' | 'PRIVILEGE_TRANSITION' | 'WORKFLOW_BYPASS' | 'REACHABILITY_ASYMMETRY' | 'TRUST_BOUNDARY_CROSSING', ContradictionSignal[]> = {
      TOPOLOGY_ANOMALY: [],
      PRIVILEGE_TRANSITION: [],
      WORKFLOW_BYPASS: [],
      REACHABILITY_ASYMMETRY: [],
      TRUST_BOUNDARY_CROSSING: []
    };

    const addSignal = (
      category: keyof typeof contradictionGroups,
      type: string,
      evidenceLinks: string[],
      description: string,
      pathId?: string,
      boundaryId?: string
    ) => {
      contradictionGroups[category].push({
        type,
        pathId,
        boundaryId,
        evidenceLinks: [...evidenceLinks].sort(),
        description
      });
    };

    for (const signal of topologySignals) {
      if (signal.type === 'PRIVILEGE_AMPLIFICATION_PATH' || signal.type === 'ROLE_CHAIN_ESCALATION') {
        addSignal(
          'PRIVILEGE_TRANSITION',
          signal.type,
          signal.evidenceLinks,
          `Deterministic privilege escalation path detected via route transition to admin.`,
          signal.pathId
        );
      } else if (signal.type === 'MULTI_BOUNDARY_ESCALATION') {
        addSignal(
          'TRUST_BOUNDARY_CROSSING',
          signal.type,
          signal.evidenceLinks,
          `Execution path traverses multiple distinct security domains and trust boundaries.`,
          signal.pathId
        );
      }
    }

    for (const signal of comparativeSignals) {
      if (signal.type === 'UNEXPECTED_PRIVILEGED_REACHABILITY') {
        addSignal(
          'REACHABILITY_ASYMMETRY',
          signal.type,
          signal.evidenceLinks,
          `Reachability asymmetry detected where a privileged route is unexpectedly reachable.`
        );
      } else if (signal.type === 'TRUST_BOUNDARY_INCONSISTENCY') {
        addSignal(
          'TRUST_BOUNDARY_CROSSING',
          signal.type,
          signal.evidenceLinks,
          `Trust boundary contains endpoints from inconsistent privilege levels.`
        );
      }
    }

    for (const signal of anomalySignals) {
      if (signal.type === 'STRUCTURAL_WORKFLOW_BYPASS') {
        addSignal(
          'WORKFLOW_BYPASS',
          signal.type,
          signal.evidenceLinks,
          `Structural bypass detected where a mandatory intermediate state was bypassed.`
        );
      } else if (signal.type === 'UNIQUE_TRUST_COLLAPSE') {
        addSignal(
          'TOPOLOGY_ANOMALY',
          signal.type,
          signal.evidenceLinks,
          `Security boundary collapses as it contains an authentication checkpoint node without segregation.`
        );
      }
    }

    const exploitSignals = discoveryResult.riskSignals.exploitSignals ?? [];
    for (const signal of exploitSignals) {
      if (signal.type === 'CROSS_ROLE_TRANSITION') {
        addSignal(
          'PRIVILEGE_TRANSITION',
          signal.type,
          signal.evidenceLinks,
          `Direct cross-role traversal detected where roles with different privileges transition directly.`
        );
      } else if (signal.type === 'TRUST_BOUNDARY_CROSSING') {
        addSignal(
          'TRUST_BOUNDARY_CROSSING',
          signal.type,
          signal.evidenceLinks,
          `Execution sequence crosses a defined trust boundary.`
        );
      }
    }

    const groupedContradictions: StructuralContradictionGroup[] = [];
    const categories: Array<keyof typeof contradictionGroups> = [
      'TOPOLOGY_ANOMALY',
      'PRIVILEGE_TRANSITION',
      'WORKFLOW_BYPASS',
      'REACHABILITY_ASYMMETRY',
      'TRUST_BOUNDARY_CROSSING'
    ];

    categories.sort().forEach(cat => {
      const signals = contradictionGroups[cat];
      if (signals.length > 0) {
        signals.sort((a, b) => {
          const typeComp = a.type.localeCompare(b.type);
          if (typeComp !== 0) return typeComp;
          return a.description.localeCompare(b.description);
        });
        groupedContradictions.push({
          category: cat,
          signals
        });
      }
    });

    // Deterministically compress structurally repeated lineage
    const uniqueEvidenceLinkStrings: string[] = [];
    const allSignals: Array<{
      type: string;
      pathId?: string;
      boundaryId?: string;
      evidenceLinks: string[];
      description: string;
    }> = [];

    for (const group of groupedContradictions) {
      allSignals.push(...group.signals);
    }

    for (const signal of allSignals) {
      const linksKey = [...signal.evidenceLinks].sort().join(',');
      if (!uniqueEvidenceLinkStrings.includes(linksKey)) {
        uniqueEvidenceLinkStrings.push(linksKey);
      }
    }

    uniqueEvidenceLinkStrings.sort();

    const sharedLineagePool: SharedLineageSegment[] = uniqueEvidenceLinkStrings.map((linksKey, index) => {
      return {
        segmentId: `lseg_${index}`,
        evidenceLinks: linksKey ? linksKey.split(',') : []
      };
    });

    const normalizedSignals = allSignals.map(signal => {
      const linksKey = [...signal.evidenceLinks].sort().join(',');
      const poolIndex = uniqueEvidenceLinkStrings.indexOf(linksKey);
      return {
        type: signal.type,
        pathId: signal.pathId,
        boundaryId: signal.boundaryId,
        sharedLineageRefId: `lseg_${poolIndex}`,
        description: signal.description
      };
    });

    normalizedSignals.sort((a, b) => {
      const typeComp = a.type.localeCompare(b.type);
      if (typeComp !== 0) return typeComp;
      return a.description.localeCompare(b.description);
    });

    const compressedLineage: CompressedContradictionLineage = {
      sharedLineagePool,
      normalizedSignals
    };

    const sharedCorridors: SharedReachabilityCorridor[] = [];
    const compressedReachabilityRefs: CompressedReachabilityReference[] = [];

    const pathCandidates = paths.filter(p => p.entityIds.length >= 2);
    const prefixMap = new Map<string, typeof pathCandidates>();

    for (const p of pathCandidates) {
      for (let len = 2; len <= p.entityIds.length; len++) {
        const prefix = p.entityIds.slice(0, len);
        const key = prefix.join(',');
        if (!prefixMap.has(key)) {
          prefixMap.set(key, []);
        }
        prefixMap.get(key)!.push(p);
      }
    }

    const sharedPrefixKeys = Array.from(prefixMap.keys()).filter(key => prefixMap.get(key)!.length >= 2);
    const maximalPrefixKeys = sharedPrefixKeys.filter(key => {
      return !sharedPrefixKeys.some(otherKey => otherKey !== key && otherKey.startsWith(key + ','));
    });

    // 1. Extract temporary candidates with their structural properties
    interface TempCorridor {
      orderedEntitySequence: string[];
      orderedTransitionSequence: string[];
      orderedBoundarySequence: string[];
      privilegeContextLineage: string[];
      sharingPaths: typeof pathCandidates;
    }

    const tempCandidates: TempCorridor[] = [];

    for (const key of maximalPrefixKeys) {
      const entityIds = key.split(',');
      const sharingPaths = prefixMap.get(key)!;
      const firstPathId = sharingPaths[0].id;
      const traceSummary = replayTraceSummaries.find(t => t.pathId === firstPathId);

      const orderedEntitySequence = [...entityIds];
      const orderedTransitionSequence: string[] = [];
      const orderedBoundarySequence: string[] = [];
      const privilegeContextLineage: string[] = [];

      if (traceSummary) {
        for (const entId of orderedEntitySequence) {
          const ent = discoveryResult.entities.find(e => e.id === entId);
          if (ent) {
            privilegeContextLineage.push(ent.category);
          }
        }

        const boundariesInPrefix = discoveryResult.boundaries.filter(b =>
          b.entityIds.some(eId => orderedEntitySequence.includes(eId))
        ).map(b => b.id);
        orderedBoundarySequence.push(...boundariesInPrefix);

        for (let i = 0; i < orderedEntitySequence.length - 1; i++) {
          const currentId = orderedEntitySequence[i];
          const nextId = orderedEntitySequence[i + 1];
          const currentEnt = discoveryResult.entities.find(e => e.id === currentId);
          const nextEnt = discoveryResult.entities.find(e => e.id === nextId);
          if (currentEnt && nextEnt) {
            orderedTransitionSequence.push(`${currentEnt.name} -> ${nextEnt.name}`);
          }
        }
      }

      tempCandidates.push({
        orderedEntitySequence,
        orderedTransitionSequence,
        orderedBoundarySequence,
        privilegeContextLineage,
        sharingPaths
      });
    }

    // 2. Perform structural canonicalization using Map to prevent fragmentation
    const canonMap = new Map<string, TempCorridor>();

    for (const cand of tempCandidates) {
      const canonKey = [
        cand.orderedEntitySequence.join(','),
        cand.orderedTransitionSequence.join(','),
        cand.orderedBoundarySequence.join(','),
        cand.privilegeContextLineage.join(',')
      ].join('|');

      if (!canonMap.has(canonKey)) {
        canonMap.set(canonKey, {
          orderedEntitySequence: cand.orderedEntitySequence,
          orderedTransitionSequence: cand.orderedTransitionSequence,
          orderedBoundarySequence: cand.orderedBoundarySequence,
          privilegeContextLineage: cand.privilegeContextLineage,
          sharingPaths: []
        });
      }

      // Merge sharing paths, ensuring deduplication by ID
      const existing = canonMap.get(canonKey)!;
      for (const p of cand.sharingPaths) {
        if (!existing.sharingPaths.some(ep => ep.id === p.id)) {
          existing.sharingPaths.push(p);
        }
      }
    }

    // 3. Sort canonical keys lexicographically for absolute stable sorting
    const sortedCanonKeys = Array.from(canonMap.keys()).sort();

    sortedCanonKeys.forEach((key, index) => {
      const cand = canonMap.get(key)!;
      const corridorId = `corridor_${String(index).padStart(3, '0')}`;

      sharedCorridors.push({
        corridorId,
        orderedEntitySequence: cand.orderedEntitySequence,
        orderedTransitionSequence: cand.orderedTransitionSequence,
        orderedBoundarySequence: cand.orderedBoundarySequence,
        privilegeContextLineage: cand.privilegeContextLineage
      });

      for (const path of cand.sharingPaths) {
        const remainingEntitySequence = path.entityIds.slice(cand.orderedEntitySequence.length);
        compressedReachabilityRefs.push({
          pathId: path.id,
          sharedCorridorRefId: corridorId,
          remainingEntitySequence
        });
      }
    });

    compressedReachabilityRefs.sort((a, b) => a.pathId.localeCompare(b.pathId));

    // 4. Perform deterministic corridor intersection indexing (Passive and synchronous)
    const intersectionsList: CorridorIntersectionNode[] = [];
    const prefixPathsMap = new Map<string, { prefix: string[], paths: typeof paths, len: number }>();

    for (const p of paths) {
      for (let len = 1; len < p.entityIds.length; len++) {
        const prefix = p.entityIds.slice(0, len);
        const key = prefix.join(',');
        if (!prefixPathsMap.has(key)) {
          prefixPathsMap.set(key, { prefix, paths: [], len });
        }
        prefixPathsMap.get(key)!.paths.push(p);
      }
    }

    for (const [key, entry] of prefixPathsMap.entries()) {
      const sharingPaths = entry.paths;
      if (sharingPaths.length >= 2) {
        // Collect divergence entities (element at index entry.len in each path's sequence)
        const nextEntities = Array.from(new Set(
          sharingPaths.map(p => p.entityIds[entry.len])
        )).sort((a, b) => a.localeCompare(b));

        // A divergence point exists only if there are 2 or more distinct diverging nodes
        if (nextEntities.length >= 2) {
          // Find all participating corridor IDs referenced by these paths
          const corridorIdsSet = new Set<string>();
          for (const path of sharingPaths) {
            const ref = compressedReachabilityRefs.find(r => r.pathId === path.id);
            if (ref) {
              corridorIdsSet.add(ref.sharedCorridorRefId);
            }
          }
          const participatingCorridorIds = Array.from(corridorIdsSet).sort((a, b) => a.localeCompare(b));

          const divergenceBoundaryContexts = Array.from(new Set(
            discoveryResult.boundaries.filter(b =>
              b.entityIds.some(eId => nextEntities.includes(eId))
            ).map(b => b.id)
          )).sort((a, b) => a.localeCompare(b));

          intersectionsList.push({
            intersectionId: '', // To be filled after lexicographical sorting
            orderedSharedPrefix: entry.prefix,
            participatingCorridorIds,
            divergenceEntityIds: nextEntities,
            divergenceBoundaryContexts
          });
        }
      }
    }

    // Sort intersections lexicographically based on their orderedSharedPrefix key
    intersectionsList.sort((a, b) =>
      a.orderedSharedPrefix.join(',').localeCompare(b.orderedSharedPrefix.join(','))
    );

    // Assign zero-padded, lexicographically stable indices
    intersectionsList.forEach((node, index) => {
      node.intersectionId = `intersection_${String(index).padStart(3, '0')}`;
    });

    const corridorIntersectionIndex: CorridorIntersectionIndex = {
      intersections: intersectionsList
    };

    // 5. Perform deterministic canonical corridor identity derivation (Passive and synchronous)
    const canonicalCorridorIdentities: CanonicalCorridorIdentity[] = [];

    for (const c of sharedCorridors) {
      const canonicalIdentityKey = `ENTITY:${c.orderedEntitySequence.join('>')}` +
                                    `||TRANSITION:${c.orderedTransitionSequence.join('>')}` +
                                    `||BOUNDARY:${c.orderedBoundarySequence.join('>')}` +
                                    `||PRIVILEGE:${c.privilegeContextLineage.join('>')}`;

      canonicalCorridorIdentities.push({
        corridorId: c.corridorId,
        canonicalIdentityKey,
        orderedEntitySequenceHash: `ENTITY_SEQ:${c.orderedEntitySequence.join('>')}`,
        orderedTransitionSequenceHash: `TRANSITION_SEQ:${c.orderedTransitionSequence.join('>')}`,
        orderedBoundarySequenceHash: `BOUNDARY_SEQ:${c.orderedBoundarySequence.join('>')}`,
        privilegeContextHash: `PRIVILEGE_SEQ:${c.privilegeContextLineage.join('>')}`
      });
    }

    // Sort canonical corridor identities lexicographically on canonicalIdentityKey
    canonicalCorridorIdentities.sort((a, b) =>
      a.canonicalIdentityKey.localeCompare(b.canonicalIdentityKey)
    );

    // 6. Perform deterministic corridor normalization hardening (Passive and synchronous)
    const processedKeys: string[] = [];
    const normalizedSignaturesList: NormalizedCorridorSignature[] = [];
    const referencesList: { corridorId: string; canonicalIdentityKey: string; signatureId: string }[] = [];

    for (const ident of canonicalCorridorIdentities) {
      const c = sharedCorridors.find(cor => cor.corridorId === ident.corridorId);
      if (!c) continue;

      if (!processedKeys.includes(ident.canonicalIdentityKey)) {
        processedKeys.push(ident.canonicalIdentityKey);
        const signatureId = `signature_${String(processedKeys.length - 1).padStart(3, '0')}`;

        normalizedSignaturesList.push({
          signatureId,
          canonicalIdentityKey: ident.canonicalIdentityKey,
          normalizedEntitySequence: [...c.orderedEntitySequence],
          normalizedTransitionSequence: [...c.orderedTransitionSequence],
          normalizedBoundarySequence: [...c.orderedBoundarySequence],
          normalizedPrivilegeLineage: [...c.privilegeContextLineage]
        });
      }

      const sigIndex = processedKeys.indexOf(ident.canonicalIdentityKey);
      const signatureId = `signature_${String(sigIndex).padStart(3, '0')}`;

      referencesList.push({
        corridorId: ident.corridorId,
        canonicalIdentityKey: ident.canonicalIdentityKey,
        signatureId
      });
    }

    // Explicitly sort lists lexicographically to guarantee absolute determinism
    normalizedSignaturesList.sort((a, b) => a.signatureId.localeCompare(b.signatureId));
    referencesList.sort((a, b) => a.corridorId.localeCompare(b.corridorId));

    const canonicalCorridorReferenceIndex: CanonicalCorridorReferenceIndex = {
      references: referencesList
    };

    // 7. Perform deterministic semantic ownership identity derivation (Passive and synchronous)
    const semanticOwnershipMap = new Map<string, string[]>();

    for (const c of sharedCorridors) {
      const compositeSemanticKey = buildSemanticCompositeKey(c);
      if (!semanticOwnershipMap.has(compositeSemanticKey)) {
        semanticOwnershipMap.set(compositeSemanticKey, []);
      }
      semanticOwnershipMap.get(compositeSemanticKey)!.push(c.corridorId);
    }

    const sortedSemanticKeys = Array.from(semanticOwnershipMap.keys()).sort((a, b) => a.localeCompare(b));

    const semanticCorridorSignatures: SemanticCorridorSignature[] = [];
    const semanticOwners: { semanticSignatureId: string; corridorIds: string[] }[] = [];

    sortedSemanticKeys.forEach((key, index) => {
      const semanticSignatureId = `semcorr_${String(index).padStart(3, '0')}`;

      // Find the first corridor matching this key
      const matchingCorridor = sharedCorridors.find(c => buildSemanticCompositeKey(c) === key)!;
      const parts = buildSemanticSignatureParts(matchingCorridor);

      semanticCorridorSignatures.push({
        semanticSignatureId,
        normalizedEntitySignature: parts.normalizedEntitySignature,
        normalizedTransitionSignature: parts.normalizedTransitionSignature,
        normalizedBoundarySignature: parts.normalizedBoundarySignature,
        normalizedPrivilegeSignature: parts.normalizedPrivilegeSignature
      });

      const corridorIds = semanticOwnershipMap.get(key)!;
      corridorIds.sort((a, b) => a.localeCompare(b));

      semanticOwners.push({
        semanticSignatureId,
        corridorIds
      });
    });

    semanticCorridorSignatures.sort((a, b) => a.semanticSignatureId.localeCompare(b.semanticSignatureId));
    semanticOwners.sort((a, b) => a.semanticSignatureId.localeCompare(b.semanticSignatureId));

    const semanticOwnershipIndex: SemanticOwnershipIndex = {
      semanticOwners
    };

    // 8. Perform deterministic differential semantic reachability divergence extraction
    const differentialSemanticDivergences: DifferentialSemanticDivergence[] = [];

    const refsByCorridor = new Map<string, CompressedReachabilityReference[]>();
    for (const ref of compressedReachabilityRefs) {
      if (!refsByCorridor.has(ref.sharedCorridorRefId)) {
        refsByCorridor.set(ref.sharedCorridorRefId, []);
      }
      refsByCorridor.get(ref.sharedCorridorRefId)!.push(ref);
    }

    const sortedCorridorKeys = Array.from(refsByCorridor.keys()).sort((a, b) => a.localeCompare(b));

    for (const corrId of sortedCorridorKeys) {
      const refs = refsByCorridor.get(corrId)!;
      refs.sort((a, b) => a.pathId.localeCompare(b.pathId));

      for (let i = 0; i < refs.length; i++) {
        for (let j = 0; j < refs.length; j++) {
          if (i === j) continue;
          const refA = refs[i];
          const refB = refs[j];

          const baseRemainingSequence = [...refA.remainingEntitySequence];
          const comparisonRemainingSequence = [...refB.remainingEntitySequence];

          let diverges = false;
          if (baseRemainingSequence.length !== comparisonRemainingSequence.length) {
            diverges = true;
          } else {
            for (let k = 0; k < baseRemainingSequence.length; k++) {
              if (baseRemainingSequence[k] !== comparisonRemainingSequence[k]) {
                diverges = true;
                break;
              }
            }
          }

          if (diverges) {
            const basePrivileges = baseRemainingSequence.map(entId => {
              const ent = discoveryResult.entities.find(e => e.id === entId);
              return ent ? ent.category : 'UNKNOWN';
            });
            const comparisonPrivileges = comparisonRemainingSequence.map(entId => {
              const ent = discoveryResult.entities.find(e => e.id === entId);
              return ent ? ent.category : 'UNKNOWN';
            });

            const privilegeContextDelta = comparisonPrivileges.filter(p => !basePrivileges.includes(p));
            const uniquePrivilegeDelta = Array.from(new Set(privilegeContextDelta)).sort((a, b) => a.localeCompare(b));

            const baseBoundaries = discoveryResult.boundaries.filter(b =>
              b.entityIds.some(eId => baseRemainingSequence.includes(eId))
            ).map(b => b.id);
            const comparisonBoundaries = discoveryResult.boundaries.filter(b =>
              b.entityIds.some(eId => comparisonRemainingSequence.includes(eId))
            ).map(b => b.id);

            const boundaryDelta = comparisonBoundaries.filter(b => !baseBoundaries.includes(b));
            const uniqueBoundaryDelta = Array.from(new Set(boundaryDelta)).sort((a, b) => a.localeCompare(b));

            let divergenceCategory:
              | 'PRIVILEGE_AMPLIFICATION'
              | 'BOUNDARY_DIVERGENCE'
              | 'REACHABILITY_EXPANSION'
              | 'SEMANTIC_WORKFLOW_SPLIT';

            const privilegeHierarchy = ['AUTH', 'RESOURCE', 'PAYMENT', 'TENANT', 'ADMIN'];
            const getMaxPrivilegeIndex = (privs: string[]): number => {
              let maxIdx = -1;
              for (const p of privs) {
                const idx = privilegeHierarchy.indexOf(p);
                if (idx > maxIdx) {
                  maxIdx = idx;
                }
              }
              return maxIdx;
            };

            const baseMaxIdx = getMaxPrivilegeIndex(basePrivileges);
            const compMaxIdx = getMaxPrivilegeIndex(comparisonPrivileges);

            if (compMaxIdx > baseMaxIdx && baseMaxIdx !== -1) {
              divergenceCategory = 'PRIVILEGE_AMPLIFICATION';
            } else if (uniqueBoundaryDelta.length > 0) {
              divergenceCategory = 'BOUNDARY_DIVERGENCE';
            } else if (baseRemainingSequence.length === 0 && comparisonRemainingSequence.length > 0) {
              divergenceCategory = 'REACHABILITY_EXPANSION';
            } else {
              divergenceCategory = 'SEMANTIC_WORKFLOW_SPLIT';
            }

            let divergenceEntity = '';
            const minLen = Math.min(baseRemainingSequence.length, comparisonRemainingSequence.length);
            let diffIdx = -1;
            for (let k = 0; k < minLen; k++) {
              if (baseRemainingSequence[k] !== comparisonRemainingSequence[k]) {
                diffIdx = k;
                break;
              }
            }

            if (diffIdx !== -1) {
              divergenceEntity = comparisonRemainingSequence[diffIdx];
            } else if (comparisonRemainingSequence.length > baseRemainingSequence.length) {
              divergenceEntity = comparisonRemainingSequence[baseRemainingSequence.length];
            } else if (baseRemainingSequence.length > comparisonRemainingSequence.length) {
              divergenceEntity = baseRemainingSequence[comparisonRemainingSequence.length];
            } else {
              const corridor = sharedCorridors.find(c => c.corridorId === corrId);
              if (corridor && corridor.orderedEntitySequence.length > 0) {
                divergenceEntity = corridor.orderedEntitySequence[corridor.orderedEntitySequence.length - 1];
              }
            }

            differentialSemanticDivergences.push({
              divergenceId: '',
              sharedCorridorRefId: corrId,
              basePathId: refA.pathId,
              comparisonPathId: refB.pathId,
              divergenceEntity,
              baseRemainingSequence,
              comparisonRemainingSequence,
              divergenceCategory,
              privilegeContextDelta: uniquePrivilegeDelta,
              orderedBoundaryDelta: uniqueBoundaryDelta
            });
          }
        }
      }
    }

    differentialSemanticDivergences.sort((a, b) => {
      const cmpBase = a.basePathId.localeCompare(b.basePathId);
      if (cmpBase !== 0) return cmpBase;
      const cmpComp = a.comparisonPathId.localeCompare(b.comparisonPathId);
      if (cmpComp !== 0) return cmpComp;
      return a.sharedCorridorRefId.localeCompare(b.sharedCorridorRefId);
    });

    differentialSemanticDivergences.forEach((div, index) => {
      div.divergenceId = `divergence_${String(index).padStart(3, '0')}`;
    });

    // 9. Perform deterministic canonical isolation integrity hardening (Passive and synchronous)
    const canonicalIsolationSignatures: CanonicalIsolationSignature[] = [];

    for (const corridor of sharedCorridors) {
      // Stably query all matching divergences
      const matchingDivs = differentialSemanticDivergences.filter(
        div => div.sharedCorridorRefId === corridor.corridorId
      );

      // Sort matching divergences stably (lexicographically by basePathId then comparisonPathId)
      matchingDivs.sort((a, b) => {
        const cmpBase = a.basePathId.localeCompare(b.basePathId);
        if (cmpBase !== 0) return cmpBase;
        return a.comparisonPathId.localeCompare(b.comparisonPathId);
      });

      const divPrivs = matchingDivs.map(
        div => `DivPriv:${div.basePathId}>${div.comparisonPathId}>${div.divergenceCategory}>${div.privilegeContextDelta.join(',')}`
      );
      const privilegeIsolationKey = `PrivLineage:[${corridor.privilegeContextLineage.join(',')}]||DivPrivs:[${divPrivs.join(';')}]`;

      const divBnds = matchingDivs.map(
        div => `DivBnd:${div.basePathId}>${div.comparisonPathId}>${div.orderedBoundaryDelta.join(',')}`
      );
      const boundaryIsolationKey = `BndSeq:[${corridor.orderedBoundarySequence.join(',')}]||DivBnds:[${divBnds.join(';')}]`;

      // Stably query and sort compressed reachability refs matching corridorId
      const matchingRefs = compressedReachabilityRefs.filter(
        ref => ref.sharedCorridorRefId === corridor.corridorId
      );
      matchingRefs.sort((a, b) => a.pathId.localeCompare(b.pathId));

      const refsStrs = matchingRefs.map(
        ref => `ReplayRef:${ref.pathId}>Remaining:${ref.remainingEntitySequence.join(',')}`
      );
      const replayOwnershipKey = `Refs:[${refsStrs.join(';')}]`;

      const collisionGuardHash = `PRIV_KEY:{${privilegeIsolationKey}}||BND_KEY:{${boundaryIsolationKey}}||REPLAY_KEY:{${replayOwnershipKey}}`;

      canonicalIsolationSignatures.push({
        isolationId: '',
        corridorId: corridor.corridorId,
        privilegeIsolationKey,
        boundaryIsolationKey,
        replayOwnershipKey,
        collisionGuardHash
      });
    }

    // Lexicographically sort by collisionGuardHash to guarantee stable ordering
    canonicalIsolationSignatures.sort((a, b) => a.collisionGuardHash.localeCompare(b.collisionGuardHash));

    // Assign sequential zero-padded isolation IDs
    canonicalIsolationSignatures.forEach((sig, index) => {
      sig.isolationId = `isolation_${String(index).padStart(3, '0')}`;
    });

    // 10. Perform deterministic reconstruction integrity index pass (Passive and synchronous)
    const reconstructionReferences: ReconstructionLineageReference[] = [];

    // Tracing SHARED_CORRIDOR
    for (const corridor of sharedCorridors) {
      const matchingRefs = compressedReachabilityRefs.filter(ref => ref.sharedCorridorRefId === corridor.corridorId);
      for (const ref of matchingRefs) {
        reconstructionReferences.push({
          referenceId: '',
          sourceType: 'SHARED_CORRIDOR',
          sourceRefId: corridor.corridorId,
          reconstructedPathId: ref.pathId,
          orderedEntitySequence: [...corridor.orderedEntitySequence],
          orderedBoundarySequence: [...corridor.orderedBoundarySequence],
          orderedPrivilegeContexts: [...corridor.privilegeContextLineage]
        });
      }
    }

    // Tracing COMPRESSED_REACHABILITY
    for (const ref of compressedReachabilityRefs) {
      const corridor = sharedCorridors.find(c => c.corridorId === ref.sharedCorridorRefId);
      if (corridor) {
        const reconstructedEntities = [...corridor.orderedEntitySequence, ...ref.remainingEntitySequence];
        const reconstructedBoundaries = discoveryResult.boundaries.filter(b =>
          b.entityIds.some(eId => reconstructedEntities.includes(eId))
        ).map(b => b.id);
        reconstructedBoundaries.sort((a, b) => a.localeCompare(b));

        const reconstructedPrivileges = reconstructedEntities.map(entId => {
          const ent = discoveryResult.entities.find(e => e.id === entId);
          return ent ? ent.category : 'UNKNOWN';
        });

        reconstructionReferences.push({
          referenceId: '',
          sourceType: 'COMPRESSED_REACHABILITY',
          sourceRefId: ref.pathId,
          reconstructedPathId: ref.pathId,
          orderedEntitySequence: reconstructedEntities,
          orderedBoundarySequence: reconstructedBoundaries,
          orderedPrivilegeContexts: reconstructedPrivileges
        });
      }
    }

    // Tracing DIFFERENTIAL_DIVERGENCE
    for (const div of differentialSemanticDivergences) {
      // Reconstruct base path
      const refBase = compressedReachabilityRefs.find(r => r.pathId === div.basePathId);
      if (refBase) {
        const corridor = sharedCorridors.find(c => c.corridorId === refBase.sharedCorridorRefId);
        if (corridor) {
          const reconstructedEntities = [...corridor.orderedEntitySequence, ...refBase.remainingEntitySequence];
          const reconstructedBoundaries = discoveryResult.boundaries.filter(b =>
            b.entityIds.some(eId => reconstructedEntities.includes(eId))
          ).map(b => b.id);
          reconstructedBoundaries.sort((a, b) => a.localeCompare(b));

          const reconstructedPrivileges = reconstructedEntities.map(entId => {
            const ent = discoveryResult.entities.find(e => e.id === entId);
            return ent ? ent.category : 'UNKNOWN';
          });

          reconstructionReferences.push({
            referenceId: '',
            sourceType: 'DIFFERENTIAL_DIVERGENCE',
            sourceRefId: div.divergenceId,
            reconstructedPathId: div.basePathId,
            orderedEntitySequence: reconstructedEntities,
            orderedBoundarySequence: reconstructedBoundaries,
            orderedPrivilegeContexts: reconstructedPrivileges
          });
        }
      }

      // Reconstruct comparison path
      const refComp = compressedReachabilityRefs.find(r => r.pathId === div.comparisonPathId);
      if (refComp) {
        const corridor = sharedCorridors.find(c => c.corridorId === refComp.sharedCorridorRefId);
        if (corridor) {
          const reconstructedEntities = [...corridor.orderedEntitySequence, ...refComp.remainingEntitySequence];
          const reconstructedBoundaries = discoveryResult.boundaries.filter(b =>
            b.entityIds.some(eId => reconstructedEntities.includes(eId))
          ).map(b => b.id);
          reconstructedBoundaries.sort((a, b) => a.localeCompare(b));

          const reconstructedPrivileges = reconstructedEntities.map(entId => {
            const ent = discoveryResult.entities.find(e => e.id === entId);
            return ent ? ent.category : 'UNKNOWN';
          });

          reconstructionReferences.push({
            referenceId: '',
            sourceType: 'DIFFERENTIAL_DIVERGENCE',
            sourceRefId: div.divergenceId,
            reconstructedPathId: div.comparisonPathId,
            orderedEntitySequence: reconstructedEntities,
            orderedBoundarySequence: reconstructedBoundaries,
            orderedPrivilegeContexts: reconstructedPrivileges
          });
        }
      }
    }

    // Tracing CANONICAL_ISOLATION
    for (const sig of canonicalIsolationSignatures) {
      const matchingRefs = compressedReachabilityRefs.filter(ref => ref.sharedCorridorRefId === sig.corridorId);
      for (const ref of matchingRefs) {
        const corridor = sharedCorridors.find(c => c.corridorId === sig.corridorId);
        if (corridor) {
          const reconstructedEntities = [...corridor.orderedEntitySequence, ...ref.remainingEntitySequence];
          const reconstructedBoundaries = discoveryResult.boundaries.filter(b =>
            b.entityIds.some(eId => reconstructedEntities.includes(eId))
          ).map(b => b.id);
          reconstructedBoundaries.sort((a, b) => a.localeCompare(b));

          const reconstructedPrivileges = reconstructedEntities.map(entId => {
            const ent = discoveryResult.entities.find(e => e.id === entId);
            return ent ? ent.category : 'UNKNOWN';
          });

          reconstructionReferences.push({
            referenceId: '',
            sourceType: 'CANONICAL_ISOLATION',
            sourceRefId: sig.isolationId,
            reconstructedPathId: ref.pathId,
            orderedEntitySequence: reconstructedEntities,
            orderedBoundarySequence: reconstructedBoundaries,
            orderedPrivilegeContexts: reconstructedPrivileges
          });
        }
      }
    }

    // Sort reconstruction references lexicographically (locale-independent)
    reconstructionReferences.sort((a, b) => {
      const cmpType = a.sourceType.localeCompare(b.sourceType);
      if (cmpType !== 0) return cmpType;
      const cmpRef = a.sourceRefId.localeCompare(b.sourceRefId);
      if (cmpRef !== 0) return cmpRef;
      return a.reconstructedPathId.localeCompare(b.reconstructedPathId);
    });

    // Assign stable sequential IDs
    reconstructionReferences.forEach((ref, index) => {
      ref.referenceId = `reconstruction_${String(index).padStart(3, '0')}`;
    });

    const reconstructionIndex: DeterministicReconstructionIndex = {
      reconstructionReferences
    };

    // Synthesize the final, immutable analysis outcome package
    const analysis = this.analysisBuilder.build(
      paths,
      enrichedEntities,
      enrichedBoundaries,
      riskSignals,
      evidence,
      exploitEvidencePackage,
      investigationViews,
      replayTraceSummaries,
      groupedContradictions,
      compressedLineage,
      sharedCorridors,
      compressedReachabilityRefs,
      corridorIntersectionIndex,
      canonicalCorridorIdentities,
      normalizedSignaturesList,
      canonicalCorridorReferenceIndex,
      semanticCorridorSignatures,
      semanticOwnershipIndex,
      differentialSemanticDivergences,
      canonicalIsolationSignatures,
      reconstructionIndex
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

function getEntityAlias(name: string, category: string): string {
  const cleanRoute = name.replace('/api/', '').split('/').map(word => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).filter(Boolean).join(' ');

  return `${cleanRoute || 'Root'} [${category}]`;
}

function getBoundaryAlias(id: string, type: string): string {
  const cleanId = id.split('_').map(word => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).filter(Boolean).join(' ');
  return `${cleanId} (${type})`;
}

function getPrivilegeContextSummary(category: string): string {
  switch (category) {
    case 'AUTH':
      return 'Identity Gateway & Authentication Verification Layer';
    case 'ADMIN':
      return 'Administrative Privilege & Resource Management Layer';
    case 'TENANT':
      return 'Multi-Tenant Isolation & Account Boundary Layer';
    case 'PAYMENT':
      return 'Financial Transaction & Settlement Layer';
    case 'RESOURCE':
      return 'Business Domain Data & Catalog Access Layer';
    default:
      return 'General Application Access Interface';
  }
}

function buildSemanticSignatureParts(corridor: {
  orderedEntitySequence: string[];
  orderedTransitionSequence: string[];
  orderedBoundarySequence: string[];
  privilegeContextLineage: string[];
}) {
  return {
    normalizedEntitySignature: `ENTITY:${corridor.orderedEntitySequence.join('>')}`,
    normalizedTransitionSignature: `TRANSITION:${corridor.orderedTransitionSequence.join('>')}`,
    normalizedBoundarySignature: `BOUNDARY:${corridor.orderedBoundarySequence.join('>')}`,
    normalizedPrivilegeSignature: `PRIV:${corridor.privilegeContextLineage.join('>')}`
  };
}

function buildSemanticCompositeKey(corridor: {
  orderedEntitySequence: string[];
  orderedTransitionSequence: string[];
  orderedBoundarySequence: string[];
  privilegeContextLineage: string[];
}): string {
  const parts = buildSemanticSignatureParts(corridor);
  return `${parts.normalizedEntitySignature}||${parts.normalizedTransitionSignature}||${parts.normalizedBoundarySignature}||${parts.normalizedPrivilegeSignature}`;
}
