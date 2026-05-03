import { Page } from '@playwright/test';
import { BasePage } from '@core/base/base.page';
import HeaderComponent from '@ui/components/header.component';
import FooterComponent from '@ui/components/footer.component';
import LoginPage from '@ui/pages/login.page';
import SearchResultsPage from '@ui/pages/search-results.page';

const HOME_PATH = '/';

export default class HomePage extends BasePage {
  readonly header: HeaderComponent;
  readonly footer: FooterComponent;

  constructor(page: Page) {
    super(page, 'HomePage');
    this.header = new HeaderComponent(page);
    this.footer = new FooterComponent(page);
  }

  async navigateToHome(): Promise<HomePage> {
    await this.goto(HOME_PATH);
    return this;
  }

  async searchProduct(productName: string): Promise<SearchResultsPage> {
    return this.header.search(productName);
  }

  async openLogin(): Promise<LoginPage> {
    return this.header.openLogin();
  }
}
