import CartPage from '@ui/pages/cart.page';

export class CartService {
  public constructor(private readonly cartPage: CartPage) {}

  public async removeProductFromCart(productName: string): Promise<void> {
    await this.cartPage.removeItem(productName);
  }

  public async updateProductQuantity(productName: string, quantity: number): Promise<void> {
    await this.cartPage.updateQuantity(productName, quantity);
  }
}
