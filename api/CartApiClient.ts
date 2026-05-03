import { BaseApiClient } from './BaseApiClient';
import { Cart } from '../models/Cart';

const CART_ENDPOINTS = {
  cart: '/cart',
  itemById: (itemId: number | string) => `/cart/items/${itemId}`
} as const;

export class CartApiClient extends BaseApiClient {
  public async addToCart(productId: number, quantity: number, token: string): Promise<Cart> {
    return this.post<Cart>(CART_ENDPOINTS.cart, {
      token,
      data: { productId, quantity }
    });
  }

  public async updateCart(itemId: number, quantity: number, token: string): Promise<Cart> {
    return this.put<Cart>(CART_ENDPOINTS.itemById(itemId), {
      token,
      data: { quantity }
    });
  }

  public async removeItem(itemId: number, token: string): Promise<Cart> {
    return this.delete<Cart>(CART_ENDPOINTS.itemById(itemId), { token });
  }
}
