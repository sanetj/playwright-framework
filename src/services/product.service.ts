import ProductPage from '@ui/pages/product.page';

export class ProductService {
  public constructor(private readonly productPage: ProductPage) {}

  public async addProductToCart(quantity = 1): Promise<void> {
    await this.productPage.selectQuantity(quantity);
    await this.productPage.addToCart();
  }
}
