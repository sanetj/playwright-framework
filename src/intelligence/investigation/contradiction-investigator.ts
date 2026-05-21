/**
 * @canonical
 * Contradiction Investigator Contracts
 * Converts cognition contradictions directly into high-ROI exploit investigation flows.
 */

export interface ContradictionReplayProbe {
  probeId: string;
  sourceContradictionId: string;
  intendedPerturbationEnvelopeId: string;
  expectedDivergence: string; // What the probe hopes to prove
}

export interface ContradictionEscalationReason {
  escalationId: string;
  mappedExploitType: string;
  justification: string;
  supportingEvidenceLineage: string[];
}

export interface FrontendRestrictionContradiction {
  contradictionId: string;
  type: 'FRONTEND_RESTRICTION_BYPASSED';
  restrictedElementSelector: string;
  successfulReplayEventId: string;
}

export interface TenantIsolationContradiction {
  contradictionId: string;
  type: 'TENANT_ISOLATION_VIOLATION';
  sourceTenantId: string;
  accessedTenantId: string;
  successfulReplayEventId: string;
}

export interface ReadonlyMutationContradiction {
  contradictionId: string;
  type: 'READONLY_MUTATION_SUCCESS';
  roleName: string;
  mutatedEntityId: string;
  successfulReplayEventId: string;
}

export interface ContradictionExploitMap {
  mappingId: string;
  sourceContradictionId: string;
  suggestedExploitCategories: string[]; // e.g., ['IDOR', 'PRIVILEGE_ESCALATION']
  generatedProbes: ContradictionReplayProbe[];
  escalationReason?: ContradictionEscalationReason;
}
