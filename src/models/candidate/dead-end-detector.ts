import { InvestigationState, InvestigationStatus } from '../workspace/investigation-state';

export interface DeadEndConfig {
  maxCandidateAttempts: number;
  maxActionsWithoutNewEvidence: number;
}

/**
 * Enforces exhaustion limits to prevent infinite AI loops.
 */
export class DeadEndDetector {
  private config: DeadEndConfig;
  private actionsSinceLastEvidence: number = 0;

  constructor(config: DeadEndConfig) {
    this.config = config;
  }

  public recordAction(producedNewEvidence: boolean) {
    if (producedNewEvidence) {
      this.actionsSinceLastEvidence = 0;
    } else {
      this.actionsSinceLastEvidence++;
    }
  }

  /**
   * Evaluates if the state machine should abort.
   */
  public evaluate(state: InvestigationState): { isDeadEnd: boolean; newStatus?: InvestigationStatus; reason?: string } {
    
    if (this.actionsSinceLastEvidence >= this.config.maxActionsWithoutNewEvidence) {
      return { 
        isDeadEnd: true, 
        newStatus: InvestigationStatus.DEAD, 
        reason: 'Evidence Stagnation (0 new nodes in N actions)' 
      };
    }

    if (state.totalCandidatesTested >= this.config.maxCandidateAttempts) {
      return {
        isDeadEnd: true,
        newStatus: InvestigationStatus.REQUIRES_HUMAN_REVIEW,
        reason: 'Max Candidate Attempts exhausted'
      };
    }

    return { isDeadEnd: false };
  }
}
