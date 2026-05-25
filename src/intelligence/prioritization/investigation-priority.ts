import { ConfidenceMetrics } from '../validation/confidence-calculator';
import { CandidateType } from '../candidates/candidate-lifecycle';

export interface PriorityMetrics {
  expectedPayoutValue: number;
  noveltyScore: number;
  logicFlawWeight: number;
  proofStrength: number;
}

/**
 * Calculates PriorityScore.
 * Optimizes for difficult, high-value logic flaws over trivial misconfigurations.
 */
export class InvestigationPriority {
  
  public calculateExpectedPayout(baseSeverity: number, acceptanceProbability: number): number {
    return baseSeverity * acceptanceProbability;
  }

  public getLogicFlawWeight(type: CandidateType): number {
    switch(type) {
      case 'CrossTenantAccess': return 10.0;
      case 'OwnershipMismatch': return 8.0;
      case 'RoleEscalation': return 9.0;
      case 'WorkflowGap': return 6.0;
      default: return 1.0;
    }
  }

  public calculatePriorityScore(
    candidateType: CandidateType,
    metrics: ConfidenceMetrics,
    acceptanceProbability: number,
    baseSeverity: number,
    noveltyScore: number = 1.0
  ): number {
    
    const expectedPayoutValue = this.calculateExpectedPayout(baseSeverity, acceptanceProbability);
    const logicFlawWeight = this.getLogicFlawWeight(candidateType);
    const proofStrength = metrics.proofConfidence;

    // Formula: (ExpectedPayoutValue + NoveltyScore + LogicFlawWeight + ProofStrength)
    // Note: Weights can be tuned.
    const priorityScore = (expectedPayoutValue * 1.5) + (noveltyScore * 1.0) + (logicFlawWeight * 2.0) + (proofStrength * 1.5);
    
    return priorityScore;
  }
}
