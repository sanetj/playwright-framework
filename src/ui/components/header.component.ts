import { Locator, Page } from '@playwright/test';
import { BasePage } from '@core/base/base.page';
import HomePage from '@ui/pages/home.page';
import LoginPage from '@ui/pages/login.page';
import CartPage from '@ui/pages/cart.page';
import SearchResultsPage from '@ui/pages/search-results.page';

export default class HeaderComponent extends BasePage {
  private readonly searchInput: Locator;
  private readonly searchButton: Locator;
  private readonly loginLink: Locator;
  private readonly cartLink: Locator;
  private readonly homeLink: Locator;

  constructor(page: Page) {
    super(page, 'HeaderComponent');
    this.searchInput = this.page.getByRole('textbox', { name: 'Search store' });
    this.searchButton = this.page.getByRole('button', { name: 'Search' });
    this.loginLink = this.page.getByRole('link', { name: 'Log in' });
    this.cartLink = this.page.getByRole('link', { name: 'Shopping cart' });
    this.homeLink = this.page.getByRole('link', { name: 'Tricentis Demo Web Shop' });
  }

  async search(productName: string): Promise<SearchResultsPage> {
    await this.fill(this.searchInput, productName, 'Header search input');
    await this.click(this.searchButton, 'Header search button');
    await this.page.waitForURL(/search/i);
    return new SearchResultsPage(this.page);
  }

  async openLogin(): Promise<LoginPage> {
    await this.click(this.loginLink, 'Header log in link');
    await this.page.waitForURL(/login/i);
    return new LoginPage(this.page);
  }

  async openCart(): Promise<CartPage> {
    await this.click(this.cartLink, 'Header shopping cart link');
    await this.page.waitForURL(/cart/i);
    return new CartPage(this.page);
  }

  async openHome(): Promise<HomePage> {
    await this.click(this.homeLink, 'Header home link');
    await this.page.waitForLoadState('domcontentloaded');
    return new HomePage(this.page);
  }
}
