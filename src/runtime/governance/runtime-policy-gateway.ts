import { ReplaySafetyClassifier, ReplayExecutionIntent } from '../safety/replay-safety-classifier';
import { TargetSafetyProfile, ProbeSafetyClass } from '../../intelligence/perturbation/probe-safety';

export class PolicyViolationError extends Error {
  constructor(message: string, public readonly intent: ReplayExecutionIntent) {
    super(`Policy Violation: ${message}`);
    this.name = 'PolicyViolationError';
  }
}

/**
 * The RuntimePolicyGateway is the absolute execution boundary.
 * All replay and perturbation execution MUST pass through this gateway.
 * Direct execution bypassing this gateway is a critical architectural violation.
 */
export class RuntimePolicyGateway {
  private classifier: ReplaySafetyClassifier;

  constructor(private readonly targetProfile: TargetSafetyProfile) {
    this.classifier = new ReplaySafetyClassifier();
  }

  /**
   * Evaluates if a given intent is allowed to execute against the current target profile.
   * Throws a PolicyViolationError if blocked.
   */
  public async authorize(intent: ReplayExecutionIntent): Promise<void> {
    const safetyClass = this.classifier.classify(intent);
    
    // 1. Check if the safety class is explicitly required to have approval but none is provided
    if (this.targetProfile.requiresApprovalFor.includes(safetyClass)) {
      throw new PolicyViolationError(
        `Action classified as ${safetyClass} requires explicit approval in the target profile.`,
        intent
      );
    }

    // 2. Check if the safety class is in ANY of the allowed categories for this target
    const isAllowed = this.targetProfile.safeCategories.some(category => 
      category.allowedClasses.includes(safetyClass)
    );

    if (!isAllowed) {
      throw new PolicyViolationError(
        `Action classified as ${safetyClass} is not permitted by any active SafeMutationCategory.`,
        intent
      );
    }

    // 3. Additional specific bounds
    const risk = this.classifier.assessRisk(safetyClass, intent);
    if (risk.isDestructive && intent.isMutationAttempt) {
      throw new PolicyViolationError(
        `Destructive mutations are strictly prohibited during adversarial replay bounds.`,
        intent
      );
    }

    // If we reach here, execution is authorized.
  }
}
