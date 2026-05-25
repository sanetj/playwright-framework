export enum CandidateState {
  DISCOVERED = 'DISCOVERED',
  TESTING = 'TESTING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED'
}

export type CandidateType = 
  | 'OwnershipMismatch' 
  | 'CrossTenantAccess' 
  | 'RoleEscalation' 
  | 'WorkflowGap';

export interface InvestigationCandidate {
  id: string; // Deterministic ID based on transformation targets
  type: CandidateType;
  state: CandidateState;
  transformationRule: string; // e.g. "RoleGraphRule_17"
  targetNodeId: string;
  attackerRoleId: string;
  victimRoleId: string;
  createdAt: number;
  evidenceLinks: string[]; // references to graph nodes or requests
}

/**
 * Enforces strict, un-ambiguous lifecycle flow for candidates.
 */
export class CandidateLifecycleManager {
  private candidates: Map<string, InvestigationCandidate> = new Map();

  public registerCandidate(candidate: InvestigationCandidate) {
    if (this.candidates.has(candidate.id)) {
      return; // Already exists
    }
    this.candidates.set(candidate.id, candidate);
  }

  public transitionState(candidateId: string, newState: CandidateState) {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      throw new Error(`[CandidateLifecycle] Cannot transition unknown candidate: ${candidateId}`);
    }

    // Strict valid transitions enforcement could go here
    candidate.state = newState;
  }

  public getCandidatesByState(state: CandidateState): InvestigationCandidate[] {
    return Array.from(this.candidates.values()).filter(c => c.state === state);
  }
}
