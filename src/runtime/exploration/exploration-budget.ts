export interface BudgetConfig {
  maxRequestsPerRole: number;
  maxActionDepth: number;
  maxRuntimeMs: number;
}

/**
 * Ensures autonomous exploration is strictly bounded.
 * Anything unbounded eventually becomes an AI research project.
 */
export class ExplorationBudget {
  private config: BudgetConfig;
  private requestsExecuted: Map<string, number> = new Map();
  private maxDepthReached: number = 0;
  private startTimeMs: number;

  constructor(config: BudgetConfig) {
    this.config = config;
    this.startTimeMs = Date.now();
  }

  public recordRequest(roleId: string) {
    const current = this.requestsExecuted.get(roleId) || 0;
    this.requestsExecuted.set(roleId, current + 1);
  }

  public recordDepth(depth: number) {
    if (depth > this.maxDepthReached) {
      this.maxDepthReached = depth;
    }
  }

  public isExhausted(roleId: string): { exhausted: boolean; reason?: string } {
    if (Date.now() - this.startTimeMs > this.config.maxRuntimeMs) {
      return { exhausted: true, reason: 'maxRuntimeMs exceeded' };
    }

    if (this.maxDepthReached >= this.config.maxActionDepth) {
      return { exhausted: true, reason: 'maxActionDepth exceeded' };
    }

    const requests = this.requestsExecuted.get(roleId) || 0;
    if (requests >= this.config.maxRequestsPerRole) {
      return { exhausted: true, reason: `maxRequestsPerRole exceeded for ${roleId}` };
    }

    return { exhausted: false };
  }
}
