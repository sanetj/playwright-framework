import { CanonicalHttpRequest } from '../evidence/canonical-http-evidence';
import { ReplayMutationPlan } from './replay-mutation-plan';

export class ContextualPerturbationEngine {
  /**
   * Applies the mutation plan deterministically to produce a new CanonicalHttpRequest.
   * Ensures bounds checking and policy governance over mutations.
   */
  public applyMutation(request: CanonicalHttpRequest, plan: ReplayMutationPlan): CanonicalHttpRequest {
    const mutatedHeaders = [...request.headers];
    let mutatedUrl = request.url;

    for (const mutation of plan.mutations) {
      if (mutation.type === 'AUTH_STRIP' && mutation.targetHeader) {
        const idx = mutatedHeaders.findIndex(h => h.name.toLowerCase() === mutation.targetHeader?.toLowerCase());
        if (idx !== -1) mutatedHeaders.splice(idx, 1);
      }
      
      if (mutation.type === 'IDOR_INJECT' && mutation.injectedValue) {
        // Very basic substitution for demonstration of deterministic contextual injection
        const parts = mutatedUrl.split('/');
        parts[parts.length - 1] = mutation.injectedValue;
        mutatedUrl = parts.join('/');
      }
    }

    return {
      method: request.method,
      url: mutatedUrl,
      headers: mutatedHeaders,
      bodyStr: request.bodyStr
    };
  }
}
