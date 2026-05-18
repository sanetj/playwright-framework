import { chromium } from '@playwright/test';
import { CrawlConfig, DEFAULT_CRAWL_CONFIG } from '../../config/defaults';
import { RouteNode, WorkflowStep } from '../../models/schema';
import { NetworkIntelligence } from '../network/network.intelligence';
import { attachBrowserInstrumentation } from '../instrumentation/browser.instrumentation';

export class IntelligentCrawler {
  private readonly routes: RouteNode[] = [];
  private readonly workflows: WorkflowStep[] = [];
  private readonly discovered = new Set<string>();

  constructor(private readonly config: CrawlConfig = DEFAULT_CRAWL_CONFIG) {}

  public async crawl(targetUrl: string): Promise<{ routes: RouteNode[]; workflows: WorkflowStep[]; network: NetworkIntelligence }> {
    const browser = await chromium.launch({ headless: this.config.headless });
    const context = await browser.newContext();
    const page = await context.newPage();

    const network = new NetworkIntelligence();
    network.attach(context);

    await attachBrowserInstrumentation(context, page, {
      onConsole: () => undefined,
      onDomMutation: (evt) => {
        this.workflows.push({
          id: `mutation:${this.workflows.length + 1}`,
          routeId: evt.route,
          action: `dom_mutation:${evt.summary}`,
          dataMutating: true,
        });
      },
      onStorageAccess: (evt) => {
        this.workflows.push({
          id: `storage:${this.workflows.length + 1}`,
          routeId: page.url(),
          action: `storage_write:${evt.storage}:${evt.key}`,
          dataMutating: true,
        });
      },
    });

    await this.explorePage(page, targetUrl, 0);
    await browser.close();

    return { routes: this.routes, workflows: this.workflows, network };
  }

  private async explorePage(page: any, url: string, depth: number): Promise<void> {
    if (depth > this.config.maxDepth || this.routes.length >= this.config.maxPages || this.discovered.has(url)) return;
    this.discovered.add(url);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.navigationTimeoutMs });
    const title = await page.title();
    this.routes.push({ id: `route:${this.routes.length + 1}`, url: page.url(), title, depth });

    const anchors: string[] = await page.$$eval('a[href]', (as: HTMLAnchorElement[]) =>
      as.map((a) => a.href).filter((href) => href.startsWith('http')).slice(0, 25),
    );

    for (const href of anchors) {
      if (new URL(href).origin !== new URL(url).origin) continue;
      this.workflows.push({
        id: `step:${this.workflows.length + 1}`,
        routeId: page.url(),
        action: `navigate:${href}`,
        transitionTo: href,
      });
      await this.explorePage(page, href, depth + 1);
    }
  }
}
