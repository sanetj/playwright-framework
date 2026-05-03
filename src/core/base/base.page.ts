import { expect, Locator, Page } from '@playwright/test';
import { createLogger, Logger } from '@core/logger/logger';

export abstract class BasePage {
  protected readonly page: Page;
  protected readonly logger: Logger;

  protected constructor(page: Page, scope?: string) {
    this.page = page;
    this.logger = createLogger(scope ?? this.constructor.name);
  }

  protected async goto(path: string): Promise<void> {
    this.logger.info('Navigating', { path });
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  protected async click(target: Locator, description: string): Promise<void> {
    this.logger.debug('Clicking element', { description });
    await target.click();
  }

  protected async fill(target: Locator, value: string, description: string): Promise<void> {
    this.logger.debug('Filling element', { description });
    await target.fill(value);
  }

  protected async expectVisible(target: Locator, description: string): Promise<void> {
    this.logger.debug('Asserting visible', { description });
    await expect(target).toBeVisible();
  }
}
