import { CanonicalHttpExchange, CanonicalHttpRequest, CanonicalHttpResponse } from '../evidence/canonical-http-evidence';
import { BrowserContext } from '@playwright/test';
import { LivePerturbationInterceptor } from '../instrumentation/live-perturbation-interceptor';
import * as crypto from 'crypto';

export enum ReplayExecutionMode {
  HTTP_ONLY = 'HTTP_ONLY',
  BROWSER_CONTEXT = 'BROWSER_CONTEXT'
}

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
  public planReplay(exchange: CanonicalHttpExchange, mutationType: string = 'unknown', customTimeout?: number): DeterministicRequestPlan | null {
    const hashData = `${exchange.exchangeId.id}_${mutationType}_${exchange.sessionId}`;
    const hashVal = crypto.createHash('sha256').update(hashData).digest('hex').substring(0, 16);
    const executionId = `replay_${hashVal}`;
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

  public async executeReplay(
    plan: DeterministicRequestPlan,
    interceptor: LivePerturbationInterceptor,
    context: BrowserContext,
    mode: ReplayExecutionMode = ReplayExecutionMode.HTTP_ONLY
  ): Promise<CanonicalHttpResponse> {
    
    // Ensure interceptor is active on this context
    await interceptor.attach(context);

    let response: CanonicalHttpResponse;

    if (mode === ReplayExecutionMode.HTTP_ONLY) {
      const apiReq = await context.request.fetch(plan.targetUrl, {
        method: plan.method,
        headers: plan.headers,
        data: plan.bodyStr,
        timeout: plan.timeoutMs
      });
      
      const resHeaders = apiReq.headers();
      const status = apiReq.status();
      const body = await apiReq.body();
      
      response = {
        status,
        headers: Object.entries(resHeaders).map(([name, value]) => ({ name, value })),
        bodyStr: body.toString('utf-8')
      };
    } else {
      // BROWSER_CONTEXT mode: open a page to trigger the workflow
      const page = await context.newPage();
      
      // Wait for the specific response that matches our mutated request
      const responsePromise = page.waitForResponse(res => res.url() === plan.targetUrl || res.url().includes(plan.targetUrl), { timeout: plan.timeoutMs });
      
      // Try to navigate directly, though in a real SPA it might require clicking.
      // For now, goto triggers the initial state.
      await page.goto(plan.targetUrl, { waitUntil: 'networkidle', timeout: plan.timeoutMs }).catch(() => {});
      
      try {
        const pwResponse = await responsePromise;
        const resHeaders = await pwResponse.allHeaders();
        let bodyStr = undefined;
        try { bodyStr = (await pwResponse.body()).toString('utf-8'); } catch {}

        response = {
          status: pwResponse.status(),
          headers: Object.entries(resHeaders).map(([name, value]) => ({ name, value })),
          bodyStr
        };
      } catch (e) {
        // Fallback if the request was never observed
        response = {
          status: 0,
          headers: [],
          bodyStr: `Replay execution failed or timed out: ${e}`
        };
      }
      
      await page.close();
    }
    
    this.completeExecution(plan.executionId);
    return response;
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
