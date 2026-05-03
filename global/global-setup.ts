import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import { env } from '@config/env.config';
import { createLogger } from '@core/logger/logger';

async function globalSetup(_config: FullConfig): Promise<void> {
  const logger = createLogger('global-setup');
  const requiredDirs = ['artifacts/logs', 'artifacts/screenshots', 'artifacts/videos', 'artifacts/traces', 'reports'];

  requiredDirs.forEach((dir) => fs.mkdirSync(path.resolve(process.cwd(), dir), { recursive: true }));

  logger.info('Global setup complete', {
    appBaseUrl: env.appBaseUrl,
    apiBaseUrl: env.apiBaseUrl,
    retries: env.retries
  });
}

export default globalSetup;
