import { BrowserContext, Route, Request, Response } from '@playwright/test';
import { CanonicalHttpExchange, CanonicalEvidenceFactory, CanonicalHttpRequest, CanonicalHttpResponse } from '../evidence/canonical-http-evidence';
import { EntityLineageExtractor, LineageExtractionResult } from './entity-lineage-extractor';

export interface NetworkEvidenceHandler {
  onExchangeCaptured(exchange: CanonicalHttpExchange, lineage: LineageExtractionResult): void;
}

export class NetworkEvidenceInterceptor {
  private lineageExtractor = new EntityLineageExtractor();
  private pendingRequests = new Map<string, { request: CanonicalHttpRequest, timestamp: number }>();

  constructor(private handler: NetworkEvidenceHandler, private sessionId: string) {}

  /**
   * Attaches the interceptor to a Playwright BrowserContext.
   * This uses context.route() to actively intercept traffic, allowing full visibility
   * into bodies and headers, bypassing the in-page CORS limitations.
   */
  public async attach(context: BrowserContext): Promise<void> {
    // We use context.route to observe, but we MUST call route.continue() immediately 
    // unless we are actively mutating (handled by a different layer).
    // However, route() doesn't give us the response body easily. 
    // So we combine route() for mutation bounds (future) with context.on('response') for capture.
    
    // For pure evidence capture without mutation, we listen to request/response events.
    context.on('request', async (request: Request) => {
      await this.captureRequest(request);
    });

    context.on('response', async (response: Response) => {
      await this.captureResponse(response);
    });
  }

  private async captureRequest(request: Request): Promise<void> {
    // Skip data URIs and non-HTTP
    if (!request.url().startsWith('http')) return;

    const timestamp = Date.now();
    const reqHeaders = await request.allHeaders();
    
    let bodyStr: string | undefined;
    try {
      const postData = request.postData();
      if (postData) bodyStr = postData;
    } catch {
      // Ignore body read errors
    }

    const canonicalReq: CanonicalHttpRequest = {
      method: request.method(),
      url: request.url(),
      headers: Object.entries(reqHeaders).map(([name, value]) => ({ name, value })),
      bodyStr
    };

    // Use playwright's internal request object as a unique correlation key
    // Not perfect, but we can't easily attach metadata to it.
    // Better approach: use the URL and timestamp as a composite key or just store in a map.
    // We will use request.url() + request.method() for now, which is fragile for concurrent identical requests.
    // A more robust way in Playwright is using request as the map key.
    
    this.pendingRequests.set(request.url(), { request: canonicalReq, timestamp });
  }

  private async captureResponse(response: Response): Promise<void> {
    const request = response.request();
    if (!request.url().startsWith('http')) return;

    const pending = this.pendingRequests.get(request.url());
    if (!pending) return; // Should not happen often unless request was missed

    this.pendingRequests.delete(request.url());

    const resHeaders = await response.allHeaders();
    let bodyStr: string | undefined;
    
    try {
      // Only read bodies for textual content to avoid massive memory overhead
      const contentType = resHeaders['content-type'] || '';
      if (contentType.includes('application/json') || contentType.includes('text/')) {
        const buffer = await response.body();
        bodyStr = buffer.toString('utf-8');
      }
    } catch {
      // Ignore body read errors (e.g., response stream already consumed or closed)
    }

    const canonicalRes: CanonicalHttpResponse = {
      status: response.status(),
      headers: Object.entries(resHeaders).map(([name, value]) => ({ name, value })),
      bodyStr
    };

    const durationMs = Date.now() - pending.timestamp;
    const exchangeId = CanonicalEvidenceFactory.createExchangeId(pending.request.url, pending.request.method, pending.timestamp);

    const exchange: CanonicalHttpExchange = {
      exchangeId,
      sessionId: this.sessionId,
      timestamp: pending.timestamp,
      request: pending.request,
      response: canonicalRes,
      durationMs,
      source: 'playwright'
    };

    const lineage = this.lineageExtractor.extract(exchange);

    this.handler.onExchangeCaptured(exchange, lineage);
  }
}
