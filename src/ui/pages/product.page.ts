import { Locator, Page } from '@playwright/test';
import { BasePage } from '@core/base/base.page';
import CartPage from '@ui/pages/cart.page';

export default class ProductPage extends BasePage {
  private readonly quantityInput: Locator;
  private readonly addToCartButton: Locator;

  constructor(page: Page) {
    super(page, 'ProductPage');
    this.quantityInput = this.page.getByLabel('Qty:');
    this.addToCartButton = this.page.getByRole('button', { name: 'Add to cart' });
  }

  async selectQuantity(quantity: number): Promise<ProductPage> {
    await this.fill(this.quantityInput, quantity.toString(), 'Product quantity input');
    return this;
  }

  async addToCart(): Promise<CartPage> {
    await this.click(this.addToCartButton, 'Add to cart button');
    await this.page.waitForLoadState('networkidle');
    return new CartPage(this.page);
  }
}
