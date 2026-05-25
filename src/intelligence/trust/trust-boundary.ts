/**
 * @canonical
 * Trust Boundary DeterministicEvaluation Substrate
 * Trust boundaries must emerge dynamically from entity lineage, role differentials, and entity propagation.
 */

export interface BoundaryEvidence {
  eventId: string;
  evidenceType: 'AUTH_TRANSITION' | 'ENTITY_PROPAGATION' | 'ROLE_DIFFERENTIAL' | 'OWNERSHIP_TRANSITION';
}

export type TrustBoundaryType = 'OWNERSHIP' | 'SESSION' | 'TENANT' | 'ROLE';

export interface TrustBoundary {
  id: string;
  type: TrustBoundaryType;
  inferredAtTs: number;
  description: string;
  evidence: BoundaryEvidence[];
}

export interface BoundaryTransition {
  id: string;
  boundaryId: string;
  fromStateContext: string;
  toStateContext: string;
  transitionEventId: string;
}

export interface BoundaryViolationCandidate {
  id: string;
  boundaryId: string;
  violatingEventId: string;
  confidenceScore: number;
  candidateDescription: string;
}

// Specialized Boundary Markers
export interface OwnershipBoundary extends TrustBoundary {
  type: 'OWNERSHIP';
  entityId: string;
  expectedOwnerSessionId: string;
}

export interface SessionBoundary extends TrustBoundary {
  type: 'SESSION';
  sessionId: string;
}

export interface TenantBoundary extends TrustBoundary {
  type: 'TENANT';
  tenantId: string;
}

export interface RoleBoundary extends TrustBoundary {
  type: 'ROLE';
  roleName: string;
}
