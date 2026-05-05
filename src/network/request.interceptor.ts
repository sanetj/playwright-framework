import { Page, Request } from '@playwright/test';

export class RequestInterceptor {
  private requests: Request[] = [];
  public attach(page: Page): void { page.on('request', (request) => this.requests.push(request)); }
  public getRequests(urlPart?: string): Request[] { return urlPart ? this.requests.filter((r) => r.url().includes(urlPart)) : this.requests; }
}
