import { Page, Response } from '@playwright/test';

export class ResponseInterceptor {
  private responses: Response[] = [];
  public attach(page: Page): void { page.on('response', (response) => this.responses.push(response)); }
  public getResponses(urlPart?: string): Response[] { return urlPart ? this.responses.filter((r) => r.url().includes(urlPart)) : this.responses; }
}
