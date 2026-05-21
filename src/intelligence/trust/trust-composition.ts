/**
 * @canonical
 * Trust Composition Engine Contracts
 * Trust must be contextual, temporal, probabilistic, inheritable, and revocable.
 */

import { TemporalWindow } from '../temporal/temporal-reasoning';

export interface TrustScope {
  scopeId: string;
  allowedActions: string[];
  restrictedEntities: string[];
}

export interface TrustIssuer {
  issuerId: string;
  issuerType: 'ROLE' | 'SESSION' | 'TENANT' | 'SYSTEM_DELEGATION';
  confidenceWeight: number;
}

export interface TrustAssertion {
  assertionId: string;
  issuer: TrustIssuer;
  subjectId: string;
  scope: TrustScope;
  probabilisticConfidence: number;
  temporalValidity: TemporalWindow;
  derivedAt: number;
  evidenceRefs: string[];
}

export interface TrustInheritance {
  inheritanceId: string;
  parentAssertionId: string;
  childSubjectId: string;
  degradationFactor: number; // Trust degrades as it inherits
  derivedAt: number;
}

export interface TrustRevocation {
  revocationId: string;
  targetAssertionId: string;
  revokedAtTs: number;
  revocationReason: string;
  evidenceRefs: string[];
}

export interface TrustConflict {
  conflictId: string;
  conflictingAssertionIds: string[];
  conflictType: 'SCOPE_OVERLAP' | 'MUTUALLY_EXCLUSIVE_DELEGATION' | 'REVOCATION_MISMATCH';
  resolutionPreference?: string;
}

export interface NestedTrustContext {
  contextId: string;
  activeAssertions: TrustAssertion[];
  activeInheritances: TrustInheritance[];
  resolvedConflicts: TrustConflict[];
}
