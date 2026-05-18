import { BrowserContext, Page } from '@playwright/test';
import { browserSensorScript } from './browser-sensor';
import { RawRuntimeEvent } from '../../intelligence/events/normalized-event';

export interface RuntimeInstrumentationOptions {
  onEvent: (event: RawRuntimeEvent) => void;
  onPageAttached?: (page: Page) => void;
}

export class RuntimeInstrumentation {
  constructor(private readonly opts: RuntimeInstrumentationOptions) {}

  public async attach(context: BrowserContext, seedPage: Page): Promise<void> {
    await context.exposeBinding('__intelNodeHook__', (_source, payload: RawRuntimeEvent) => this.opts.onEvent(payload));
    await context.addInitScript(browserSensorScript);
    await this.instrumentPage(seedPage);
    context.on('page', async (page) => {
      await this.instrumentPage(page);
      this.opts.onPageAttached?.(page);
    });
  }

  private async instrumentPage(page: Page): Promise<void> {
    await page.addInitScript(browserSensorScript);
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        this.opts.onEvent({ type: 'navigation', ts: Date.now(), href: frame.url(), payload: { title: '', frame: 'main' }, traceId: `nav_${Date.now()}` });
      }
    });
  }
}
