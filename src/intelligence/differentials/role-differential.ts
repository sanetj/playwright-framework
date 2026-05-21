/**
 * @canonical
 * Multi-Role Differential Engine
 * Computes deterministic differences between workflows across different roles/tenants to identify authorization drift.
 */

export interface DifferentialEvidence {
  evidenceEventId: string;
  sourceSessionId: string;
  description: string;
}

export interface DifferentialConfidence {
  score: number;
  isDeterministicallyProven: boolean; // Must be true if backed by a replay artifact
}

export interface TrustBoundaryDifferential {
  differentialId: string;
  boundaryId: string;
  expectedOwnerSessionId: string;
  violatingSessionId: string;
  observedEvidence: DifferentialEvidence[];
}

export interface EntityReachabilityDelta {
  entityId: string;
  baseRoleSessionId: string;
  comparisonRoleSessionId: string;
  isReachableInBase: boolean;
  isReachableInComparison: boolean;
  reachabilityEvidenceId?: string; // Links back to canonical graph
}

export interface WorkflowCapabilityDelta {
  workflowActionType: string;
  baseRoleSessionId: string;
  comparisonRoleSessionId: string;
  isCapableInBase: boolean;
  isCapableInComparison: boolean;
  evidenceId?: string;
}

export interface ReplayBehaviorDifferential {
  differentialId: string;
  baseReplaySessionId: string;
  comparisonReplaySessionId: string;
  divergedAtEventId: string;
  behavioralDeltaDescription: string;
}

export interface RoleDifferentialResult {
  resultId: string;
  baseRoleName: string;
  comparisonRoleName: string;
  trustBoundaryDifferentials: TrustBoundaryDifferential[];
  entityReachabilityDeltas: EntityReachabilityDelta[];
  workflowCapabilityDeltas: WorkflowCapabilityDelta[];
  replayBehaviorDifferentials: ReplayBehaviorDifferential[];
  confidence: DifferentialConfidence;
  calculatedAtTs: number;
}
