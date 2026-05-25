export enum InvestigationStatus {
  BOOTSTRAP = 'BOOTSTRAP',
  EXPLORING = 'EXPLORING',
  TESTING = 'TESTING',
  PAUSED = 'PAUSED',
  COMPLETE = 'COMPLETE',
  DEAD = 'DEAD',
  REQUIRES_HUMAN_REVIEW = 'REQUIRES_HUMAN_REVIEW'
}

/**
 * Pure state container for the investigation.
 * Local to the workspace. No business logic.
 */
export interface InvestigationState {
  workspaceId: string;
  status: InvestigationStatus;
  
  // High-level progress counters for dead-end detection
  totalRequestsExecuted: number;
  totalCandidatesGenerated: number;
  totalCandidatesTested: number;
  
  // Last seen epoch for pruning reference
  currentEpoch: number;
  
  lastUpdatedAt: number;
}

export const createInitialState = (workspaceId: string): InvestigationState => ({
  workspaceId,
  status: InvestigationStatus.BOOTSTRAP,
  totalRequestsExecuted: 0,
  totalCandidatesGenerated: 0,
  totalCandidatesTested: 0,
  currentEpoch: 0,
  lastUpdatedAt: Date.now()
});
