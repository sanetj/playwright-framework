import { createLogger, Logger } from '@core/logger/logger';
import { dbFixture } from './dbFixture';

export interface LoggerFixture {
  logger: Logger;
}

export const loggerFixture = dbFixture.extend<LoggerFixture>({
  logger: async ({}, use, testInfo) => {
    const logger = createLogger(`Test:${testInfo.title}`);
    logger.info('Starting test', { file: testInfo.file, title: testInfo.title });
    await use(logger);
    logger.info('Finished test', { status: testInfo.status });
  }
});

export { expect } from '@playwright/test';
