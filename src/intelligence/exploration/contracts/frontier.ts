/**
 * @canonical
 * Contracts for representing known-but-unexplored runtime states.
 */

export interface FrontierPriority {
  score: number;
  factors: Record<string, number>;
  recalculatedAt: number;
}

export interface WorkflowBranchCandidate {
  originEventId: string;
  proposedActionType: string;
  targetElementSelector?: string;
  targetUrl?: string;
  rationale: string;
}

export interface FrontierCandidate {
  id: string;
  discoveredAtTs: number;
  discoverySourceEventId: string;
  priority: FrontierPriority;
  branchProposal: WorkflowBranchCandidate;
  status: 'PENDING' | 'EVALUATING' | 'EXPLORED' | 'DISCARDED';
}

export interface ExplorationFrontier {
  addCandidate(candidate: FrontierCandidate): void;
  getNextHighestPriority(): FrontierCandidate | null;
  updateStatus(candidateId: string, status: FrontierCandidate['status']): void;
  getPendingCount(): number;
}

export type ExplorationTerminationReason = 'BUDGET_EXHAUSTED' | 'RISK_EXCEEDED' | 'OBJECTIVE_MET' | 'MANUAL_ABORT';
export type ExplorationApprovalState = 'PENDING_POLICY_REVIEW' | 'APPROVED' | 'DENIED' | 'REQUIRES_HUMAN';

export interface ExplorationBudget {
  maxGraphDepth: number;
  maxTransitions: number;
  maxTimeMs: number;
}

export interface ExplorationRiskEnvelope {
  allowedDomains: string[];
  allowedMethods: string[];
  maxRiskCategory: string;
}

export interface BoundedExplorationContract {
  contractId: string;
  objectiveDescription: string;
  budget: ExplorationBudget;
  riskEnvelope: ExplorationRiskEnvelope;
  approvalState: ExplorationApprovalState;
  terminationReason?: ExplorationTerminationReason;
}

