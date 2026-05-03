import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { env } from '@config/env.config';
import { createLogger, Logger } from '@core/logger/logger';

export class ApiClient {
  private context?: APIRequestContext;
  private readonly logger: Logger;

  public constructor(private readonly baseUrl: string = env.apiBaseUrl) {
    this.logger = createLogger('ApiClient');
  }

  public async init(token?: string): Promise<void> {
    this.context = await request.newContext({
      baseURL: this.baseUrl,
      extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : undefined
    });
  }

  public async get<T>(url: string): Promise<T> {
    return this.handle<T>('GET', url);
  }

  public async post<T>(url: string, payload: unknown): Promise<T> {
    return this.handle<T>('POST', url, payload);
  }

  public async dispose(): Promise<void> {
    await this.context?.dispose();
  }

  private async handle<T>(method: 'GET' | 'POST', url: string, data?: unknown): Promise<T> {
    if (!this.context) throw new Error('ApiClient is not initialized. Call init() first.');
    this.logger.info('API request', { method, url });
    const response: APIResponse = method === 'GET'
      ? await this.context.get(url)
      : await this.context.post(url, { data });

    if (!response.ok()) {
      throw new Error(`API request failed [${response.status()}] ${method} ${url}`);
    }

    return (await response.json()) as T;
  }
}
