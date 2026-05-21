/**
 * @canonical
 * Contradiction Engine Contracts
 * Contradictions are first-class, immutable historical entities. Resolved contradictions change state, but are never deleted.
 */

export type ContradictionType =
  | 'OBSERVATION_CONFLICT'
  | 'TRUST_ASSUMPTION_INVALID'
  | 'IMPOSSIBLE_STATE_TRANSITION'
  | 'REPLAY_DIVERGENCE'
  | 'OWNERSHIP_INCONSISTENCY'
  | 'AUTH_CONTRADICTION'
  | 'STALE_AUTHORITY'
  | 'TEMPORAL_INCONSISTENCY';

export type ContradictionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ContradictionResolutionState = 'UNRESOLVED' | 'INVESTIGATING' | 'RESOLVED_TRUE_POSITIVE' | 'RESOLVED_FALSE_POSITIVE' | 'STALE';

export interface ContradictionEvidence {
  evidenceEventId: string;
  evidenceType: 'ASSERTION' | 'OBSERVATION' | 'EXPECTATION';
  description: string;
}

export interface ContradictionResolution {
  resolvedAtTs: number;
  resolutionState: ContradictionResolutionState;
  resolutionReason: string;
  resolvingEventId?: string;
}

export interface ContradictionLifecycle {
  detectedAtTs: number;
  lastUpdatedAtTs: number;
  expirationTs?: number; // For stale contradiction expiration
}

export interface Contradiction {
  id: string;
  type: ContradictionType;
  severity: ContradictionSeverity;
  confidence: number;
  evidenceRefs: ContradictionEvidence[];
  conflictingAssertions: string[];
  temporalWindow: { startTs: number; endTs: number };
  resolutionState: ContradictionResolutionState;
  resolutionDetails?: ContradictionResolution;
  lifecycle: ContradictionLifecycle;
  derivedAt: number;
  lineageRefs: string[];
}

export interface ContradictionCluster {
  clusterId: string;
  coreContradictionId: string;
  relatedContradictionIds: string[];
  commonLineageOriginId?: string;
}
