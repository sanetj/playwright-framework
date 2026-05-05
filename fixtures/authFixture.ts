import { BrowserContext, Page } from '@playwright/test';
import { baseFixture } from './baseFixture';

type Role = 'admin' | 'customer' | 'guest';

export interface RoleAuthFixtures {
  adminPage: Page;
  customerPage: Page;
  guestRolePage: Page;
}

async function createRoleContext(browser: any, role: Role): Promise<BrowserContext> {
  const storageStatePath = process.env[`AUTH_${role.toUpperCase()}_STATE_PATH`];
  return browser.newContext({ storageState: role === 'guest' ? undefined : storageStatePath });
}

export const authFixture = baseFixture.extend<RoleAuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await createRoleContext(browser, 'admin');
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  customerPage: async ({ browser }, use) => {
    const context = await createRoleContext(browser, 'customer');
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  guestRolePage: async ({ browser }, use) => {
    const context = await createRoleContext(browser, 'guest');
    const page = await context.newPage();
    await use(page);
    await context.close();
  }
});

export { expect } from '@playwright/test';
