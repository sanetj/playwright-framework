import type { FullConfig } from '@playwright/test';
import { createLogger } from '@core/logger/logger';

async function globalTeardown(_config: FullConfig): Promise<void> {
  const logger = createLogger('global-teardown');
  logger.info('Global teardown complete');
}

export default globalTeardown;
