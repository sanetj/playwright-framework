import path from 'node:path';
import { test as base, BrowserContext, Page } from '@playwright/test';
import HomePage from '@ui/pages/home.page';
import LoginPage from '@ui/pages/login.page';
import RegisterPage from '@ui/pages/register.page';
import ProductPage from '@ui/pages/product.page';
import SearchResultsPage from '@ui/pages/search-results.page';
import CartPage from '@ui/pages/cart.page';
import CheckoutPage from '@ui/pages/checkout.page';
import HeaderComponent from '@ui/components/header.component';
import FooterComponent from '@ui/components/footer.component';

export interface PageObjectFixtures {
  homePage: HomePage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  productPage: ProductPage;
  searchResultsPage: SearchResultsPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  headerComponent: HeaderComponent;
  footerComponent: FooterComponent;
}

export interface SessionFixtures {
  authenticatedPage: Page;
  guestContext: BrowserContext;
  guestPage: Page;
}

export interface WorkerSessionFixtures {
  authenticatedStorageStatePath: string;
}

const AUTH_STATE_DIR = path.resolve(process.cwd(), '.auth');
const AUTH_STATE_PATH = path.resolve(AUTH_STATE_DIR, 'authenticated-user.json');

export const baseFixture = base.extend<PageObjectFixtures & SessionFixtures, WorkerSessionFixtures>({
  authenticatedStorageStatePath: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const email = process.env.AUTH_EMAIL;
      const password = process.env.AUTH_PASSWORD;

      if (!email || !password) {
        throw new Error('Missing AUTH_EMAIL or AUTH_PASSWORD environment variable for authenticated fixture.');
      }

      const loginPage = new LoginPage(page);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await loginPage.login(email, password);

      await context.storageState({ path: AUTH_STATE_PATH });
      await context.close();

      await use(AUTH_STATE_PATH);
    },
    { scope: 'worker' }
  ],

  authenticatedPage: async ({ browser, authenticatedStorageStatePath }, use) => {
    const context = await browser.newContext({
      storageState: authenticatedStorageStatePath
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  guestContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: undefined });
    await use(context);
    await context.close();
  },

  guestPage: async ({ guestContext }, use) => {
    const page = await guestContext.newPage();
    await use(page);
    await page.close();
  },

  homePage: async ({ page }, use) => { await use(new HomePage(page)); },
  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
  registerPage: async ({ page }, use) => { await use(new RegisterPage(page)); },
  productPage: async ({ page }, use) => { await use(new ProductPage(page)); },
  searchResultsPage: async ({ page }, use) => { await use(new SearchResultsPage(page)); },
  cartPage: async ({ page }, use) => { await use(new CartPage(page)); },
  checkoutPage: async ({ page }, use) => { await use(new CheckoutPage(page)); },
  headerComponent: async ({ page }, use) => { await use(new HeaderComponent(page)); },
  footerComponent: async ({ page }, use) => { await use(new FooterComponent(page)); }
});

export { expect } from '@playwright/test';
