import { createLogger, Logger } from '@core/logger/logger';
import { dbFixture } from './dbFixture';

export interface LoggerFixture { logger: Logger; }

export const loggerFixture = dbFixture.extend<LoggerFixture>({
  logger: async ({ page }, use, testInfo) => {
    const logger = createLogger(`Test:${testInfo.title}`);
    logger.info('Starting test', { file: testInfo.file, title: testInfo.title });
    await use(logger);
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = testInfo.outputPath('failure.png');
      await page.screenshot({ path: screenshot, fullPage: true });
      await testInfo.attach('failure-screenshot', { path: screenshot, contentType: 'image/png' });
    }
    logger.info('Finished test', { status: testInfo.status });
  }
});

export { expect } from '@playwright/test';
