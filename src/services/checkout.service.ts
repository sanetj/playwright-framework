import CheckoutPage, { BillingDetails } from '@ui/pages/checkout.page';

export class CheckoutService {
  public constructor(private readonly checkoutPage: CheckoutPage) {}

  public async placeOrder(details: BillingDetails, shippingMethod = 'Ground'): Promise<void> {
    await this.checkoutPage.fillBillingDetails(details);
    await this.checkoutPage.selectShippingMethod(shippingMethod);
    await this.checkoutPage.placeOrder();
  }
}
