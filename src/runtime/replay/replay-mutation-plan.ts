import { CanonicalHttpRequest } from '../evidence/canonical-http-evidence';

export type MutationType = 'AUTH_STRIP' | 'IDOR_INJECT' | 'ROLE_ELEVATION' | 'PARAM_POLLUTION';

export interface MutationAction {
  type: MutationType;
  targetHeader?: string;
  targetParam?: string;
  injectedValue?: string;
}

export interface ReplayMutationPlan {
  planId: string;
  originalExecutionId: string;
  mutations: MutationAction[];
  expectedOutcome?: number; // e.g., expecting 403 or 401
}

export class MutationPlanGenerator {
  /**
   * Generates structured mutation plans without engaging in uncontrolled fuzzing loops.
   */
  public generatePlans(request: CanonicalHttpRequest): ReplayMutationPlan[] {
    const plans: ReplayMutationPlan[] = [];

    // 1. Auth Stripping Plan (BAC Testing)
    if (request.headers.some(h => h.name.toLowerCase() === 'authorization' || h.name.toLowerCase() === 'cookie')) {
      plans.push({
        planId: `mut_strip_${Date.now()}`,
        originalExecutionId: 'original', // Set by coordinator
        mutations: [
          { type: 'AUTH_STRIP', targetHeader: 'authorization' },
          { type: 'AUTH_STRIP', targetHeader: 'cookie' }
        ],
        expectedOutcome: 401
      });
    }

    // 2. IDOR Injection Plan (If UUIDs or IDs are detected in URL)
    // Basic heuristic, relies on proper ontology mapping in advanced cases.
    const urlParts = request.url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart.match(/^\d+$/) || lastPart.length > 10) {
      plans.push({
        planId: `mut_idor_${Date.now()}`,
        originalExecutionId: 'original',
        mutations: [
          { type: 'IDOR_INJECT', targetParam: 'url_path', injectedValue: 'TARGET_IDOR_UUID' }
        ],
        expectedOutcome: 403
      });
    }

    return plans;
  }
}
