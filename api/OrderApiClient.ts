import { BaseApiClient } from './BaseApiClient';
import { Order } from '../models/Order';

const ORDER_ENDPOINTS = {
  orders: '/orders',
  orderById: (orderId: number | string) => `/orders/${orderId}`
} as const;

export class OrderApiClient extends BaseApiClient {
  public async createOrder(payload: { cartId: number; paymentMethod: string }, token: string): Promise<Order> {
    return this.post<Order>(ORDER_ENDPOINTS.orders, { token, data: payload });
  }

  public async getOrder(orderId: number, token: string): Promise<Order> {
    return this.get<Order>(ORDER_ENDPOINTS.orderById(orderId), { token });
  }

  public async verifyOrder(orderId: number, token: string): Promise<boolean> {
    const order = await this.getOrder(orderId, token);
    return order.id === orderId && order.status.length > 0;
  }
}
