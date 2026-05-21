import { BrowserContext, Route, Request, Response } from '@playwright/test';
import { CanonicalHttpExchange, CanonicalEvidenceFactory, CanonicalHttpRequest, CanonicalHttpResponse } from '../evidence/canonical-http-evidence';
import { EntityLineageExtractor, LineageExtractionResult } from './entity-lineage-extractor';

export interface NetworkEvidenceHandler {
  onExchangeCaptured(exchange: CanonicalHttpExchange, lineage: LineageExtractionResult): void;
}

export class NetworkEvidenceInterceptor {
  private lineageExtractor = new EntityLineageExtractor();
  // Store a Promise for the canonical request so response handlers can await it
  private pendingRequests = new Map<string, { requestPromise: Promise<CanonicalHttpRequest>, timestamp: number }>();

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
    const key = `${request.method()}:${request.url()}`;

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

    this.pendingRequests.set(key, { requestPromise, timestamp });
  }

  private async captureResponse(response: Response): Promise<void> {
    try {
      const request = response.request();
      if (!request.url().startsWith('http')) return;

      const key = `${request.method()}:${request.url()}`;
      
      // The response might fire before the request handler even had a chance to run synchronously.
      // Wait up to 100ms for the request to appear in the map.
      let pending = this.pendingRequests.get(key);
      if (!pending) {
        await new Promise(r => setTimeout(r, 50));
        pending = this.pendingRequests.get(key);
      }
      
      if (!pending) {
        return; 
      }

      this.pendingRequests.delete(key);
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
      const exchangeId = CanonicalEvidenceFactory.createExchangeId(canonicalReq.url, canonicalReq.method, pending.timestamp);

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
      console.log(`[${this.sessionId}] FATAL ERROR in captureResponse: ${e}`);
    }
  }
}






