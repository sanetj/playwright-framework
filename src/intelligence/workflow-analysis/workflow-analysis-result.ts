import { WorkflowPath } from './workflow-path-extractor';
import { WorkflowEvidence } from './workflow-evidence';
import { WorkflowEntity, WorkflowBoundary } from '../workflow-models/workflow-entities';
import { WorkflowRiskSignals as WorkflowRiskSignal } from '../workflow-models/workflow-risk-signals';

export interface EnrichedWorkflowEntity extends WorkflowEntity {
  alias: string;
}

export interface EnrichedWorkflowBoundary extends WorkflowBoundary {
  alias: string;
}

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

export interface EnrichedInvestigationViewItem {
  referenceId: string;
  alias: string;
  replayTrace?: ReplayTraceSummary;
  evidencePackageId?: string;
  topologySummary?: string;
}

export interface EnrichedInvestigationViews {
  byTrustBoundary: Record<string, EnrichedInvestigationViewItem[]>;
  byAffectedEntity: Record<string, EnrichedInvestigationViewItem[]>;
  byAsymmetryType: Record<string, EnrichedInvestigationViewItem[]>;
  byTopologyAnomaly: Record<string, EnrichedInvestigationViewItem[]>;
  byPrivilegeTransition: Record<string, EnrichedInvestigationViewItem[]>;
}

export interface InvestigationViews {
  byTrustBoundary: Record<string, string[]>;
  byAffectedEntity: Record<string, string[]>;
  byAsymmetryType: Record<string, string[]>;
  byTopologyAnomaly: Record<string, string[]>;
  byPrivilegeTransition: Record<string, string[]>;
  enrichedViews?: EnrichedInvestigationViews;
}

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

export interface WorkflowAnalysisResult {
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
