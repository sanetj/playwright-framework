import { BrowserContext, Page } from '@playwright/test';

export interface CrawlConfig {
  maxDepth: number;
  maxPages: number;
  navigationTimeoutMs: number;
}

export class GovernedCrawlEngine {
  private discoveredUrls = new Set<string>();

  constructor(private config: CrawlConfig = { maxDepth: 2, maxPages: 10, navigationTimeoutMs: 15000 }) {}

  public async crawl(context: BrowserContext, startUrl: string): Promise<void> {
    const page = await context.newPage();
    try {
      await this.explore(page, startUrl, 0);
    } finally {
      await page.close();
    }
  }

  private async explore(page: Page, url: string, depth: number): Promise<void> {
    if (depth > this.config.maxDepth) return;
    if (this.discoveredUrls.size >= this.config.maxPages) return;
    if (this.discoveredUrls.has(url)) return;

    this.discoveredUrls.add(url);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.navigationTimeoutMs });
      await page.waitForTimeout(2000); 
    } catch (e) {
      return;
    }

    const origin = new URL(url).origin;
    const links = await page.$$eval('a[href]', (anchors) => 
      anchors.map(a => a.href)
    );

    const sameOriginLinks = links.filter(href => href.startsWith(origin));

    const buttons = page.locator('button:visible');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      try {
        await buttons.nth(i).click({ timeout: 1000, force: true });
        await page.waitForTimeout(1000); 
      } catch {
        // ignore
      }
    }

    for (const link of sameOriginLinks) {
      if (!this.discoveredUrls.has(link) && this.discoveredUrls.size < this.config.maxPages) {
        await this.explore(page, link, depth + 1);
      }
    }
  }
}
