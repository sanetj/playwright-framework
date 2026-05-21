import { CanonicalHttpExchange, CanonicalHttpRequest } from '../evidence/canonical-http-evidence';

export interface ReplayMetadata {
  executionId: string;
  originalExchangeId: string;
  timeoutMs: number;
  timestamp: number;
}

export interface DeterministicRequestPlan {
  executionId: string;
  targetUrl: string;
  method: string;
  headers: Record<string, string>;
  bodyStr?: string;
  timeoutMs: number;
}

/**
 * ReplayCoordinator enforces deterministic async coordination during replay.
 * It prevents race conditions and ensures that replays occur in exactly 
 * the expected sequence, tracked via execution IDs.
 */
export class ReplayCoordinator {
  private deduplicationSet = new Set<string>();
  private pendingExecutions = new Map<string, DeterministicRequestPlan>();
  
  constructor(private readonly defaultTimeoutMs: number = 30000) {}

  /**
   * Plans a deterministic replay, deduplicating if identical to a pending run.
   */
  public planReplay(exchange: CanonicalHttpExchange, customTimeout?: number): DeterministicRequestPlan | null {
    const executionId = `replay_${exchange.exchangeId}_${Date.now()}`;
    const hashKey = this.hashRequest(exchange.request);
    
    if (this.deduplicationSet.has(hashKey)) {
      // Already planned or executed an identical replay in this context
      return null;
    }
    this.deduplicationSet.add(hashKey);

    const plan: DeterministicRequestPlan = {
      executionId,
      targetUrl: exchange.request.url,
      method: exchange.request.method,
      headers: this.reconstructHeaders(exchange.request.headers),
      bodyStr: exchange.request.bodyStr,
      timeoutMs: customTimeout || this.defaultTimeoutMs
    };

    this.pendingExecutions.set(executionId, plan);
    return plan;
  }

  public completeExecution(executionId: string): void {
    this.pendingExecutions.delete(executionId);
  }

  public hasPendingExecutions(): boolean {
    return this.pendingExecutions.size > 0;
  }

  private hashRequest(req: CanonicalHttpRequest): string {
    // Basic deduplication hash. Can be expanded with structural hashing.
    return `${req.method}:${req.url}:${req.bodyStr?.length || 0}`;
  }

  private reconstructHeaders(headers: { name: string, value: string }[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (const h of headers) {
      map[h.name.toLowerCase()] = h.value;
    }
    return map;
  }
}
