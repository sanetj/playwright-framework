import { ReplayEligibleCandidate } from './replay-eligible-candidate';
import { ValidatedFinding } from './exploit-validation-engine';
import { ExploitProof } from '../evidence/exploit-proof-capture';
import { ReplayMutationPlan } from '../replay/replay-mutation-plan';
import { CanonicalHttpRequest } from '../evidence/canonical-http-evidence';

/**
 * @architecture_authority Validation Lifecycle Contracts
 * @responsibility Defines the strict separation of concerns within the validation pipeline.
 * @invariants Lifecycle phases must not be collapsed or merged.
 */

export interface IValidationPlanner {
  /** Lifecycle Stage 1: Validation Planning */
  generatePlans(request: CanonicalHttpRequest): ReplayMutationPlan[];
}

export interface IValidationExecutor {
  /** Lifecycle Stage 2 & 3: Validation Execution & Evidence Collection */
  // Omitted complex types for brevity, represents ReplayCoordinator boundaries
  executeReplay(planReq: any, interceptor: any, ctx: any, mode: any): Promise<any>;
}

export interface IEvidenceAssessor {
  /** Lifecycle Stage 4: Evidence Assessment */
  validate(originalResponse: any, mutatedResponse: any, mutationTarget: string): any;
}

export interface IValidationResultConstructer {
  /** Lifecycle Stage 5: Validation Result Generation */
  validate(finding: any, proof: ExploitProof): ValidatedFinding;
}
