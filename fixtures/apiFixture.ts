import { test as base } from '@playwright/test';
import { createLogger, Logger } from '../src/core/logger/logger';
import { AuthApiClient } from '../api/AuthApiClient';
import { ProductApiClient } from '../api/ProductApiClient';
import { CartApiClient } from '../api/CartApiClient';
import { OrderApiClient } from '../api/OrderApiClient';

export interface ApiFixtures {
  apiLogger: Logger;
  authApi: AuthApiClient;
  productApi: ProductApiClient;
  cartApi: CartApiClient;
  orderApi: OrderApiClient;
}

export const apiTest = base.extend<ApiFixtures>({
  apiLogger: async ({}, use, testInfo) => {
    const logger = createLogger(`API:${testInfo.title}`);
    await use(logger);
  },

  authApi: async ({ apiLogger }, use) => {
    const client = new AuthApiClient(apiLogger);
    await client.initContext();
    await use(client);
    await client.disposeContext();
  },

  productApi: async ({ apiLogger }, use) => {
    const client = new ProductApiClient(apiLogger);
    await client.initContext();
    await use(client);
    await client.disposeContext();
  },

  cartApi: async ({ apiLogger }, use) => {
    const client = new CartApiClient(apiLogger);
    await client.initContext();
    await use(client);
    await client.disposeContext();
  },

  orderApi: async ({ apiLogger }, use) => {
    const client = new OrderApiClient(apiLogger);
    await client.initContext();
    await use(client);
    await client.disposeContext();
  }
});

export { expect } from '@playwright/test';
