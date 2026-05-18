import { BrowserContext, Page } from '@playwright/test';
import { browserSensorScript } from './browser-sensor';
import { RawRuntimeEvent } from '../../intelligence/events/normalized-event';

export interface RuntimeInstrumentationOptions {
  onEvent: (event: RawRuntimeEvent) => void;
}

export class RuntimeInstrumentation {
  constructor(private readonly opts: RuntimeInstrumentationOptions) {}

  async attach(context: BrowserContext, page: Page): Promise<void> {
    await context.exposeBinding('__intelNodeHook__', (_source, payload: RawRuntimeEvent) => {
      this.opts.onEvent(payload);
    });

    await context.addInitScript(browserSensorScript);
    await page.addInitScript(browserSensorScript);

    context.on('page', async (p) => {
      await p.addInitScript(browserSensorScript);
      p.on('framenavigated', (frame) => {
        if (frame === p.mainFrame()) {
          this.opts.onEvent({ type: 'navigation', ts: Date.now(), href: frame.url(), payload: { title: '' } });
        }
      });
    });
  }
}
