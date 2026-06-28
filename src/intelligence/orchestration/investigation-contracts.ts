import { IInvestigationContext } from './investigation-context';
import { CanonicalHttpExchange } from '../../runtime/evidence/canonical-http-evidence';
import { ValidatedFinding } from '../../runtime/validation/exploit-validation-engine';

/**
 * @architecture_authority Investigation Lifecycle Contracts
 * @responsibility Defines the strict architectural boundaries, invariants, and completion criteria for an Investigation.
 */
export interface IInvestigationLifecycle {
  /**
   * Goal 4: Investigation Evolution (Expansion)
   * Formalizes how evidence expands an Investigation without duplicating it.
   */
  correlateEvidence(context: IInvestigationContext, exchange: CanonicalHttpExchange): void;

  /**
   * Goal 4: Investigation Evolution (Refinement)
   * Formalizes how validation refines an Investigation.
   */
  integrateValidation(context: IInvestigationContext, finding: ValidatedFinding): void;

  /**
   * Goal 10: Investigation Completion
   * Defines architectural sufficiency. An Investigation is complete when 
   * all synthesized candidates have been processed by validation.
   */
  isComplete(context: IInvestigationContext, pendingCandidatesCount: number): boolean;
}
