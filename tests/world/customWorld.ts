import path from 'node:path';
import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from '@playwright/test';
import HomePage from '../../src/ui/pages/home.page';
import LoginPage from '../../src/ui/pages/login.page';
import RegisterPage from '../../src/ui/pages/register.page';
import CartPage from '../../src/ui/pages/cart.page';
import ProductPage from '../../src/ui/pages/product.page';
import CheckoutPage from '../../src/ui/pages/checkout.page';
import SearchResultsPage from '../../src/ui/pages/search-results.page';
import HeaderComponent from '../../src/ui/components/header.component';
import { AuthService } from '../../src/services/auth.service';
import { CartService } from '../../src/services/cart.service';
import { CheckoutService } from '../../src/services/checkout.service';
import { ProductService } from '../../src/services/product.service';

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  homePage!: HomePage;
  loginPage!: LoginPage;
  registerPage!: RegisterPage;
  cartPage!: CartPage;
  productPage!: ProductPage;
  checkoutPage!: CheckoutPage;
  searchResultsPage!: SearchResultsPage;
  headerComponent!: HeaderComponent;

  authService!: AuthService;
  cartService!: CartService;
  productService!: ProductService;
  checkoutService!: CheckoutService;

  testData = {
    user: {
      email: process.env.TEST_USER_EMAIL ?? '',
      password: process.env.TEST_USER_PASSWORD ?? '',
      firstName: process.env.TEST_USER_FIRST_NAME ?? 'QA',
      lastName: process.env.TEST_USER_LAST_NAME ?? 'User'
    },
    product: { searchKeyword: process.env.TEST_PRODUCT_SEARCH_KEYWORD ?? 'laptop' }
  };

  constructor(options: IWorldOptions) {
    super(options);
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch({ headless: process.env.HEADLESS !== 'false' });
    this.context = await this.browser.newContext({
      baseURL: process.env.APP_BASE_URL,
      recordVideo: { dir: path.resolve(process.cwd(), 'artifacts/cucumber/videos') }
    });
    await this.context.tracing.start({ screenshots: true, snapshots: true });
    this.page = await this.context.newPage();

    this.homePage = new HomePage(this.page);
    this.loginPage = new LoginPage(this.page);
    this.registerPage = new RegisterPage(this.page);
    this.cartPage = new CartPage(this.page);
    this.productPage = new ProductPage(this.page);
    this.checkoutPage = new CheckoutPage(this.page);
    this.searchResultsPage = new SearchResultsPage(this.page);
    this.headerComponent = new HeaderComponent(this.page);

    this.authService = new AuthService(this.loginPage, this.registerPage);
    this.cartService = new CartService(this.cartPage);
    this.productService = new ProductService(this.productPage);
    this.checkoutService = new CheckoutService(this.checkoutPage);
  }
}

setWorldConstructor(CustomWorld);
