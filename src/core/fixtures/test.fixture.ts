import { test as base } from '@playwright/test';
import { ApiClient } from '@api/clients/api.client';
import { testDataManager, TestDataManager } from '@data/factories/test-data.manager';

interface FrameworkFixtures {
  apiClient: ApiClient;
  data: TestDataManager;
}

export const test = base.extend<FrameworkFixtures>({
  data: async ({}, use) => {
    await use(testDataManager);
  },
  apiClient: async ({}, use) => {
    const client = new ApiClient();
    await client.init(process.env.API_TOKEN);
    await use(client);
    await client.dispose();
  }
});

export { expect } from '@playwright/test';
