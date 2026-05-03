import { Locator, Page } from '@playwright/test';
import { BasePage } from '@core/base/base.page';
import ProductPage from '@ui/pages/product.page';

export default class SearchResultsPage extends BasePage {
  private readonly productGrid: Locator;

  constructor(page: Page) {
    super(page, 'SearchResultsPage');
    this.productGrid = this.page.locator('.product-grid');
  }

  async openProduct(productName: string): Promise<ProductPage> {
    const productLink = this.productGrid.getByRole('link', { name: productName, exact: true });
    await this.click(productLink, `Product link: ${productName}`);
    await this.page.waitForLoadState('domcontentloaded');
    return new ProductPage(this.page);
  }
}
