import { ProbeSafetyClass, ProbeMutationRisk } from '../../intelligence/perturbation/probe-safety';

export interface ReplayExecutionIntent {
  method: string;
  url: string;
  bodySize?: number;
  isMutationAttempt: boolean; // True if this request is a perturbation probe (e.g. swapping IDs)
}

export class ReplaySafetyClassifier {
  /**
   * Classifies a replay operation based on its method, URL, and intent.
   * This ensures we know exactly what kind of risk a particular request poses
   * during governed execution.
   */
  public classify(intent: ReplayExecutionIntent): ProbeSafetyClass {
    const method = intent.method.toUpperCase();
    const url = intent.url.toLowerCase();

    // 1. Irreversible / High Risk actions
    if (this.isHighRisk(url)) {
      return 'HIGH_RISK';
    }

    // 2. Cross-Tenant risk (e.g. swapping tenant IDs in URL/Body)
    // Note: A more advanced check would analyze the payload, but this is a baseline.
    if (intent.isMutationAttempt && this.looksLikeTenantBoundary(url)) {
      return 'CROSS_TENANT';
    }

    // 3. State Mutation (POST/PUT/DELETE/PATCH)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return 'STATE_MUTATION';
    }

    // 4. Low Impact (GETs with query params that might cause small state changes, like analytics)
    if (url.includes('track') || url.includes('analytics') || url.includes('log')) {
      return 'LOW_IMPACT';
    }

    // 5. Read Only (Standard GETs)
    if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD' || method === 'LAUNCH') {
      return 'READ_ONLY';
    }

    // Default fallback to state mutation for safety if unknown method
    return 'STATE_MUTATION';
  }

  public assessRisk(safetyClass: ProbeSafetyClass, intent: ReplayExecutionIntent): ProbeMutationRisk {
    const isDestructive = safetyClass === 'HIGH_RISK' || (safetyClass === 'STATE_MUTATION' && intent.method === 'DELETE');
    const canExposePiData = safetyClass === 'CROSS_TENANT' || safetyClass === 'HIGH_RISK';
    const canCorruptDatabase = safetyClass === 'HIGH_RISK';

    return {
      riskId: `risk_${Date.now()}`,
      isDestructive,
      canExposePiData,
      canCorruptDatabase
    };
  }

  private isHighRisk(url: string): boolean {
    return /payment|billing|invoice|checkout|transfer|delete_account|drop|truncate/i.test(url);
  }

  private looksLikeTenantBoundary(url: string): boolean {
    // Simple heuristic: if the URL contains a UUID or typical tenant identifier structure
    return /tenant_id|org_id|account_id|workspace_id/i.test(url);
  }
}
