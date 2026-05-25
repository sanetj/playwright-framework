import { CanonicalHttpExchange, CanonicalHttpResponse } from '../evidence/canonical-http-evidence';

export interface DeterminismCheckResult {
  isDeterministic: boolean;
  varianceReasons: string[];
}

/**
 * ReplayDeterminism is responsible for evaluating whether multiple runs of the same
 * replay produce equivalent results. It flags unstable endpoints to suppress noise.
 */
export class ReplayDeterminismChecker {
  
  public evaluateDeterminism(baseExchange: CanonicalHttpExchange, replayExchange: CanonicalHttpExchange): DeterminismCheckResult {
    const reasons: string[] = [];
    
    if (!baseExchange.response && !replayExchange.response) {
      return { isDeterministic: true, varianceReasons: [] };
    }
    if (!baseExchange.response || !replayExchange.response) {
      return {
        isDeterministic: false,
        varianceReasons: ['One of the exchanges is missing a response']
      };
    }
    
    // 1. Status Code Determinism
    if (baseExchange.response.status !== replayExchange.response.status) {
      reasons.push(`Status code variance: ${baseExchange.response.status} vs ${replayExchange.response.status}`);
    }

    // 2. Body Structure Determinism
    if (!this.compareBodySemantics(baseExchange.response, replayExchange.response)) {
      reasons.push(`Semantic body variance detected`);
    }

    return {
      isDeterministic: reasons.length === 0,
      varianceReasons: reasons
    };
  }

  private compareBodySemantics(res1: CanonicalHttpResponse, res2: CanonicalHttpResponse): boolean {
    if (!res1.bodyStr && !res2.bodyStr) return true;
    if (!res1.bodyStr || !res2.bodyStr) return false;

    // For JSON, we check structural keys, ignoring dynamic values like timestamps
    try {
      const obj1 = JSON.parse(res1.bodyStr);
      const obj2 = JSON.parse(res2.bodyStr);
      return this.compareJsonStructure(obj1, obj2);
    } catch {
      // If not JSON, fall back to exact length heuristic or basic substring comparison
      // to avoid failing on minor dynamic HTML tokens (e.g. CSRF tokens)
      const lenDiff = Math.abs(res1.bodyStr.length - res2.bodyStr.length);
      return lenDiff < 50; // Arbitrary leniency for non-JSON content
    }
  }

  private compareJsonStructure(obj1: any, obj2: any): boolean {
    if (typeof obj1 !== typeof obj2) return false;
    if (typeof obj1 !== 'object' || obj1 === null) return true; // Primitive values are ignored structurally

    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();

    if (keys1.length !== keys2.length) return false;
    for (let i = 0; i < keys1.length; i++) {
      if (keys1[i] !== keys2[i]) return false;
      if (!this.compareJsonStructure(obj1[keys1[i]], obj2[keys2[i]])) return false;
    }

    return true;
  }
}
