import { Page, Route } from '@playwright/test';

export class ApiMockManager {
  public async mockJson(page: Page, urlPattern: string | RegExp, payload: unknown, status = 200): Promise<void> {
    await page.route(urlPattern, async (route: Route) => {
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
    });
  }

  public async clear(page: Page): Promise<void> { await page.unrouteAll({ behavior: 'ignoreErrors' }); }
}
