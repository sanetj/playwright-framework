import { dataFixture } from './dataFixture';
import { DatabaseClient } from '../src/db/database.client';

export interface DbClient { query: <T>(text: string, params?: unknown[]) => Promise<any>; disconnect: () => Promise<void>; }
export interface DbFixture { dbClient: DbClient; }

export const dbFixture = dataFixture.extend<DbFixture>({
  dbClient: async ({}, use) => {
    const dbClient = new DatabaseClient();
    await use(dbClient);
    await dbClient.disconnect();
  }
});

export { expect } from '@playwright/test';
