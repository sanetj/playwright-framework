import { apiFixture } from './apiFixture';

export interface ProductData {
  searchKeyword: string;
  sku?: string;
}

export interface TestUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface FrameworkTestData {
  user: TestUserData;
  product: ProductData;
}

export interface DataFixture {
  testData: FrameworkTestData;
}

export const dataFixture = apiFixture.extend<DataFixture>({
  testData: async ({}, use) => {
    const userEmail = process.env.TEST_USER_EMAIL;
    const userPassword = process.env.TEST_USER_PASSWORD;

    if (!userEmail || !userPassword) {
      throw new Error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD environment variable.');
    }

    await use({
      user: {
        email: userEmail,
        password: userPassword,
        firstName: process.env.TEST_USER_FIRST_NAME,
        lastName: process.env.TEST_USER_LAST_NAME
      },
      product: {
        searchKeyword: process.env.TEST_PRODUCT_SEARCH_KEYWORD ?? 'laptop',
        sku: process.env.TEST_PRODUCT_SKU
      }
    });
  }
});

export { expect } from '@playwright/test';
