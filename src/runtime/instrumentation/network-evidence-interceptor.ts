import { BrowserContext, Route, Request, Response } from '@playwright/test';
import { CanonicalHttpExchange, CanonicalEvidenceFactory, CanonicalHttpRequest, CanonicalHttpResponse } from '../evidence/canonical-http-evidence';
import { EntityLineageExtractor, LineageExtractionResult } from './entity-lineage-extractor';
import { RuntimeExchangeIdGenerator } from '../evidence/runtime-exchange-id';

export interface NetworkEvidenceHandler {
  onExchangeCaptured(exchange: CanonicalHttpExchange, lineage: LineageExtractionResult): void;
}

export class NetworkEvidenceInterceptor {
  private lineageExtractor = new EntityLineageExtractor();
  private exchangeIdGenerator = new RuntimeExchangeIdGenerator();
  // Correlate using Request object identity, avoiding URL-based correlation failures
  private pendingRequests = new Map<Request, { requestPromise: Promise<CanonicalHttpRequest>, timestamp: number }>();

  constructor(private handler: NetworkEvidenceHandler, private sessionId: string) {}

  public async attach(context: BrowserContext): Promise<void> {
    context.on('request', async (request: Request) => {
      await this.captureRequest(request);
    });

    context.on('response', async (response: Response) => {
      await this.captureResponse(response);
    });
  }

  private async captureRequest(request: Request): Promise<void> {
    if (!request.url().startsWith('http')) return;
    const timestamp = Date.now();

    // Create the promise immediately so response handler can await it if it arrives very quickly
    const requestPromise = (async () => {
      const reqHeaders = await request.allHeaders();
      let bodyStr: string | undefined;
      try {
        const postData = request.postData();
        if (postData) bodyStr = postData;
      } catch {
        // Ignore
      }

      return {
        method: request.method(),
        url: request.url(),
        headers: Object.entries(reqHeaders).map(([name, value]) => ({ name, value })),
        bodyStr
      };
    })();

    this.pendingRequests.set(request, { requestPromise, timestamp });
  }

  private async captureResponse(response: Response): Promise<void> {
    try {
      const request = response.request();
      if (!request.url().startsWith('http')) return;
      
      // The response might fire before the request handler even had a chance to run synchronously.
      // Wait up to 100ms for the request to appear in the map.
      let pending = this.pendingRequests.get(request);
      if (!pending) {
        await new Promise(r => setTimeout(r, 50));
        pending = this.pendingRequests.get(request);
      }
      
      if (!pending) {
        return; 
      }

      this.pendingRequests.delete(request);
      const canonicalReq = await pending.requestPromise;

      const resHeaders = await response.allHeaders();
      let bodyStr: string | undefined;
      
      try {
        const contentType = resHeaders['content-type'] || '';
        if (contentType.includes('application/json') || contentType.includes('text/')) {
          const buffer = await response.body();
          bodyStr = buffer.toString('utf-8');
        }
      } catch (e) {
        // Ignore
      }

      const canonicalRes: CanonicalHttpResponse = {
        status: response.status(),
        headers: Object.entries(resHeaders).map(([name, value]) => ({ name, value })),
        bodyStr
      };

      const durationMs = Date.now() - pending.timestamp;
      
      // Extract frame ID if available
      const frameId = request.frame()?.name() || undefined;
      
      // Generate RuntimeExchangeId
      const exchangeId = this.exchangeIdGenerator.generate(
        canonicalReq.method,
        canonicalReq.url,
        canonicalReq.bodyStr ? 'hash_of_body' : 'empty', // Ideally hash the body
        'nav_' + this.sessionId, // placeholder for navigation ID
        frameId
      );

      const exchange: CanonicalHttpExchange = {
        exchangeId,
        sessionId: this.sessionId,
        timestamp: pending.timestamp,
        request: canonicalReq,
        response: canonicalRes,
        durationMs,
        source: 'playwright'
      };

      const lineage = this.lineageExtractor.extract(exchange);
      this.handler.onExchangeCaptured(exchange, lineage);
    } catch (e) {
    }
  }
}






