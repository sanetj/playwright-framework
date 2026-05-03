import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { env } from '../config/env.config';
import { Logger } from '../src/core/logger/logger';

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  token?: string;
  retries?: number;
}

export class BaseApiClient {
  protected context?: APIRequestContext;

  public constructor(
    protected readonly logger: Logger,
    private readonly baseUrl: string = env.apiBaseUrl,
    private readonly defaultHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  ) {}

  public async initContext(extraHeaders: Record<string, string> = {}): Promise<void> {
    this.context = await request.newContext({
      baseURL: this.baseUrl,
      extraHTTPHeaders: { ...this.defaultHeaders, ...extraHeaders }
    });
  }

  public async disposeContext(): Promise<void> {
    await this.context?.dispose();
  }

  protected async get<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.executeWithRetry<T>('GET', url, options);
  }

  protected async post<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.executeWithRetry<T>('POST', url, options);
  }

  protected async put<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.executeWithRetry<T>('PUT', url, options);
  }

  protected async patch<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.executeWithRetry<T>('PATCH', url, options);
  }

  protected async delete<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.executeWithRetry<T>('DELETE', url, options);
  }

  private async executeWithRetry<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    options: RequestOptions
  ): Promise<T> {
    if (!this.context) {
      throw new Error('API context not initialized. Call initContext() first.');
    }

    const retries = options.retries ?? 2;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const headers = {
          ...(options.headers ?? {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
        };

        this.logger.info('API request', { method, url, attempt: attempt + 1, params: options.params });

        const response = await this.call(method, url, {
          headers,
          params: options.params,
          data: options.data
        });

        if (!response.ok()) {
          const responseText = await response.text();
          const message = `Request failed [${response.status()}] ${method} ${url}`;
          this.logger.error(message, { responseText });
          throw new Error(message);
        }

        this.logger.info('API response', { method, url, status: response.status() });
        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn('API attempt failed', { method, url, attempt: attempt + 1, error: lastError.message });
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error(`Request failed after retries: ${method} ${url}`);
  }

  private async call(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    options: { headers?: Record<string, string>; params?: Record<string, string | number | boolean>; data?: unknown }
  ): Promise<APIResponse> {
    if (!this.context) {
      throw new Error('API context not initialized.');
    }

    switch (method) {
      case 'GET':
        return this.context.get(url, { headers: options.headers, params: options.params });
      case 'POST':
        return this.context.post(url, { headers: options.headers, params: options.params, data: options.data });
      case 'PUT':
        return this.context.put(url, { headers: options.headers, params: options.params, data: options.data });
      case 'PATCH':
        return this.context.patch(url, { headers: options.headers, params: options.params, data: options.data });
      case 'DELETE':
        return this.context.delete(url, { headers: options.headers, params: options.params, data: options.data });
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }
}
