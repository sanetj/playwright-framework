/**
 * @canonical
 * Differential Graph Execution Engine Contracts
 * Computes replay-backed differences between workflows, comparing entity access and capability mismatches.
 */

import { CanonicalWorkflow } from './workflow-canonicalization';
import { EntityReachabilityDelta, WorkflowCapabilityDelta } from './role-differential';

export interface WorkflowEquivalence {
  equivalenceId: string;
  baseCanonicalWorkflowId: string;
  comparisonCanonicalWorkflowId: string;
  isEquivalent: boolean;
  divergenceReason?: string;
}

export interface EntityAccessComparison {
  comparisonId: string;
  entityReachabilityDeltas: EntityReachabilityDelta[];
  detectedIdorCandidates: boolean;
}

export interface CapabilityMismatch {
  mismatchId: string;
  workflowCapabilityDeltas: WorkflowCapabilityDelta[];
  detectedPrivilegeEscalationCandidates: boolean;
}

export interface ReplayOutcomeDifference {
  differenceId: string;
  baseSessionFinalStateId: string;
  comparisonSessionFinalStateId: string;
  isSemanticallyIdentical: boolean;
  httpStatusDelta?: { base: number; comparison: number };
}

export interface DifferentialEvidenceChain {
  chainId: string;
  baseReplayLineageRef: string;
  comparisonReplayLineageRef: string;
  differentialResultRefs: string[]; // Links to deltas and mismatches
}

export interface DifferentialComparison {
  comparisonId: string;
  baseRoleProfileId: string;
  comparisonRoleProfileId: string;
  workflowEquivalence: WorkflowEquivalence[];
  entityAccessComparison: EntityAccessComparison;
  capabilityMismatch: CapabilityMismatch;
  replayOutcomeDifferences: ReplayOutcomeDifference[];
  evidenceChain: DifferentialEvidenceChain;
  calculatedAtTs: number;
}

export interface DifferentialExecutionEngine {
  engineId: string;
  compareSessions(baseSessionId: string, comparisonSessionId: string): Promise<DifferentialComparison>;
  canonicalizeAndCompare(baseWorkflows: CanonicalWorkflow[], comparisonWorkflows: CanonicalWorkflow[]): Promise<DifferentialComparison>;
}
