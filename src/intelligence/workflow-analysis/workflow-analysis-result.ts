import { WorkflowPath } from './workflow-path-extractor';
import { WorkflowEvidence } from './workflow-evidence';
import { WorkflowEntity, WorkflowBoundary } from '../workflow-models/workflow-entities';
import { WorkflowRiskSignals as WorkflowRiskSignal } from '../workflow-models/workflow-risk-signals';

/**
 * EnrichedWorkflowEntity
 * Extends the canonical graph entity to expose human-readable aliases.
 * @invariant ID-ISOLATION: The canonical ID (wf_ent_*) remains completely unchanged.
 * @invariant ALIAS-DETERMINISM: The alias string must be derived using 100% stable, route-categorized parsing.
 */
export interface EnrichedWorkflowEntity extends WorkflowEntity {
  alias: string;
}

/**
 * EnrichedWorkflowBoundary
 * Extends the canonical trust boundary to expose human-readable aliases.
 * @invariant ID-ISOLATION: The canonical ID (wf_bnd_*) remains completely unchanged.
 * @invariant ALIAS-DETERMINISM: The alias is deterministically synthesized from type and id tokens.
 */
export interface EnrichedWorkflowBoundary extends WorkflowBoundary {
  alias: string;
}

/**
 * ExploitEvidencePackage
 * Grouped topological finding summary providing high-fidelity, serializable context.
 * @invariant REFERENTIAL-INTEGRITY: every evidencePackageId resolves to exactly this package.
 * @invariant DETERMINISM: Summary lists and arrays must remain sorted lexicographically.
 */
export interface ExploitEvidencePackage {
  packageId?: string;
  pathIds?: string[];
  topologySummary: string;
  anomalySummary: string;
  asymmetrySummary: string;
  trustBoundarySummary: string;
  evidenceLinks: string[];
  affectedEntities: string[];
  replayLinkedIdentifiers: string[];
}

/**
 * EnrichedInvestigationViewItem
 * Navigable relational metadata linking grouped views to their chronological replay traces.
 * @invariant REFERENTIAL-INTEGRITY: pathId/boundaryId maps exactly to active identifiers.
 * @invariant PASSIVE-EXPORT: View item properties are write-only serialized entities.
 */
export interface EnrichedInvestigationViewItem {
  referenceId: string;
  alias: string;
  replayTrace?: ReplayTraceSummary;
  evidencePackageId?: string;
  topologySummary?: string;
}

/**
 * EnrichedInvestigationViews
 * Grouped navigation matrices mapping security signals to interactive trace items.
 * @invariant ORDERING-GUARANTEE: Array items must preserve stable, pre-sorted lexicographical ordering.
 */
export interface EnrichedInvestigationViews {
  byTrustBoundary: Record<string, EnrichedInvestigationViewItem[]>;
  byAffectedEntity: Record<string, EnrichedInvestigationViewItem[]>;
  byAsymmetryType: Record<string, EnrichedInvestigationViewItem[]>;
  byTopologyAnomaly: Record<string, EnrichedInvestigationViewItem[]>;
  byPrivilegeTransition: Record<string, EnrichedInvestigationViewItem[]>;
}

/**
 * InvestigationViews
 * Backward-compatible, dual-layer indexing structures for human and AI operators.
 * @invariant BACKWARD-COMPATIBILITY: Flat ID-string mappings remain intact.
 */
export interface InvestigationViews {
  byTrustBoundary: Record<string, string[]>;
  byAffectedEntity: Record<string, string[]>;
  byAsymmetryType: Record<string, string[]>;
  byTopologyAnomaly: Record<string, string[]>;
  byPrivilegeTransition: Record<string, string[]>;
  enrichedViews?: EnrichedInvestigationViews;
}

/**
 * ReplayTraceSummary
 * Chronological, sequence-preserving trace representing an active execution flow.
 * @invariant REPLAY-SUPREMACY: Trace sequences must be 100% derived from chronological graph path steps.
 * @invariant NO-SYNTHETICS: No artificial edges or inferred actions may be injected into the trace.
 * @invariant PRIVILEGE-ACCURACY: Privilege context summaries must match node categories exactly.
 */
export interface ReplayTraceSummary {
  pathId: string;
  alias: string;
  orderedReplayTrace: string[];
  orderedBoundarySequence: string[];
  orderedRoleTransitionSequence: string[];
  orderedWorkflowTransitionSequence: string[];
  sourcePrivilegeContext: string;
  targetPrivilegeContext: string;
}

/**
 * WorkflowAnalysisResult
 * Top-level immutable contract freezing all deterministic cognition outcomes.
 * @invariant SCHEMA-VERSIONING: Explicit exportContractVersion & cognitionSchemaVersion are frozen to "1.0.0".
 */
export interface WorkflowAnalysisResult {
  exportContractVersion: string;
  cognitionSchemaVersion: string;
  paths: WorkflowPath[];
  entities: EnrichedWorkflowEntity[];
  boundaries: EnrichedWorkflowBoundary[];
  riskSignals: WorkflowRiskSignal[];
  evidence: WorkflowEvidence[];
  exploitEvidencePackage?: ExploitEvidencePackage;
  investigationViews?: InvestigationViews;
  replayTraceSummaries?: ReplayTraceSummary[];
}

/**
 * WorkflowAnalysisBuilder
 * Aggregates workflow analysis outcomes into a single, cohesive, copied result structure.
 */
export class WorkflowAnalysisBuilder {
  /**
   * Aggregates result fields by copying arrays to ensure immutability.
   *
   * @param paths Traversed workflow paths
   * @param entities Workflow entities classified
   * @param boundaries Boundary intersections mapped
   * @param riskSignals Triggered risk signals
   * @param evidence Structured evidence packages
   * @returns Copied workflow analysis result package
   */
  public build(
    paths: WorkflowPath[],
    entities: EnrichedWorkflowEntity[],
    boundaries: EnrichedWorkflowBoundary[],
    riskSignals: WorkflowRiskSignal[],
    evidence: WorkflowEvidence[],
    exploitEvidencePackage?: ExploitEvidencePackage,
    investigationViews?: InvestigationViews,
    replayTraceSummaries?: ReplayTraceSummary[]
  ): WorkflowAnalysisResult {
    return {
      exportContractVersion: '1.0.0',
      cognitionSchemaVersion: '1.0.0',
      paths: [...paths],
      entities: [...entities],
      boundaries: [...boundaries],
      riskSignals: [...riskSignals],
      evidence: [...evidence],
      exploitEvidencePackage,
      investigationViews,
      replayTraceSummaries
    };
  }
}
