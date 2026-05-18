import { BrowserContext, Request, Response } from '@playwright/test';
import { ApiEndpoint, AuthSignal } from '../../models/schema';

export class NetworkIntelligence {
  private endpoints = new Map<string, ApiEndpoint>();
  private authSignals: AuthSignal[] = [];

  public attach(context: BrowserContext): void {
    context.on('request', (req) => { void this.onRequest(req); });
    context.on('response', (res) => this.onResponse(res));
  }

  public getEndpoints(): ApiEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  public getAuthSignals(): AuthSignal[] {
    return this.authSignals;
  }

  private async onRequest(request: Request): Promise<void> {
    const key = `${request.method()}:${request.url().split('?')[0]}`;
    if (!this.endpoints.has(key)) {
      this.endpoints.set(key, {
        id: key,
        url: request.url().split('?')[0],
        method: request.method() as ApiEndpoint['method'],
        statusCodes: [],
        contentTypes: [],
        authObserved: [],
        parameters: Object.keys(request.headers()),
        riskTags: [],
      });
    }

    const endpoint = this.endpoints.get(key)!;
    const authHeader = await request.headerValue('authorization');
    if (authHeader) {
      endpoint.authObserved.push('authorization');
      if (authHeader.startsWith('Bearer ')) {
        this.authSignals.push({ mechanism: 'jwt', evidence: `Bearer token sent to ${endpoint.url}`, confidence: 0.8 });
      }
    }
  }

  private async onResponse(response: Response): Promise<void> {
    const key = `${response.request().method()}:${response.url().split('?')[0]}`;
    const endpoint = this.endpoints.get(key);
    if (!endpoint) return;

    endpoint.statusCodes.push(response.status());
    const ct = response.headers()['content-type'];
    if (ct) endpoint.contentTypes.push(ct);

    if (response.headers()['access-control-allow-origin']) {
      endpoint.riskTags.push('cors-exposed');
    }
  }
}
