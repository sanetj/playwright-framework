import { ApiClient } from '@api/clients/api.client';
import { authFixture } from './authFixture';

export interface ApiFixture {
  apiClient: ApiClient;
}

export const apiFixture = authFixture.extend<ApiFixture>({
  apiClient: async ({}, use) => {
    const apiClient = new ApiClient();
    await apiClient.init(process.env.API_TOKEN);
    await use(apiClient);
    await apiClient.dispose();
  }
});

export { expect } from '@playwright/test';
