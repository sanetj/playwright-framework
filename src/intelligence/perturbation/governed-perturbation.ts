/**
 * @canonical
 * Governed Replay Perturbation Contracts
 * Safely mutates replayed requests within strict policy boundaries. NO autonomous fuzzing.
 */

export interface IdMutationTarget {
  targetFieldId: string;
  originalValue: string;
  injectedValue: string;
}

export interface TenantMutationTarget {
  targetTenantHeaderOrField: string;
  originalTenantId: string;
  injectedTenantId: string;
}

export interface AuthHeaderMutation {
  headerName: string;
  action: 'STRIP' | 'REPLACE' | 'TAMPER';
  injectedValue?: string;
}

export interface WorkflowSequencePerturbation {
  skippedEventId?: string;
  duplicatedEventId?: string;
  outOfOrderEventIds?: string[];
}

export interface ReplayPerturbationEnvelope {
  envelopeId: string;
  intentDescription: string;
  idMutations: IdMutationTarget[];
  tenantMutations: TenantMutationTarget[];
  authMutations: AuthHeaderMutation[];
  sequencePerturbations: WorkflowSequencePerturbation[];
}

export interface ReplayMutationApproval {
  approvalId: string;
  envelopeId: string;
  approvedByPolicyId: string;
  approvedAtTs: number;
}

export interface ReplayMutationEvidence {
  evidenceId: string;
  baseReplaySessionId: string;
  perturbedReplaySessionId: string;
  appliedEnvelopeId: string;
}

export interface SafePerturbationBoundary {
  canApplyEnvelope(envelope: ReplayPerturbationEnvelope): boolean;
  applyEnvelope(envelope: ReplayPerturbationEnvelope, payload: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Minimal Deterministic Reference Implementation
 * Proves that perturbation is bounded and policy-driven, NOT an autonomous fuzzer.
 */
export class MinimalAuthMutationBoundary implements SafePerturbationBoundary {
  public canApplyEnvelope(envelope: ReplayPerturbationEnvelope): boolean {
    // This boundary ONLY allows auth header stripping/replacing. No sequence or ID fuzzing allowed here.
    return (
      envelope.authMutations.length > 0 &&
      envelope.idMutations.length === 0 &&
      envelope.tenantMutations.length === 0 &&
      envelope.sequencePerturbations.length === 0
    );
  }

  public applyEnvelope(envelope: ReplayPerturbationEnvelope, payload: Record<string, unknown>): Record<string, unknown> {
    if (!this.canApplyEnvelope(envelope)) {
      throw new Error('PerturbationEnvelope rejected by SafePerturbationBoundary constraints.');
    }

    const mutatedPayload = { ...payload };
    const headers = (mutatedPayload.headers as Record<string, string>) || {};

    for (const mutation of envelope.authMutations) {
      if (mutation.action === 'STRIP') {
        delete headers[mutation.headerName];
      } else if (mutation.action === 'REPLACE' && mutation.injectedValue) {
        headers[mutation.headerName] = mutation.injectedValue;
      }
    }

    mutatedPayload.headers = headers;
    return mutatedPayload;
  }
}
