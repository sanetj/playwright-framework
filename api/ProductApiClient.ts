import { BaseApiClient } from './BaseApiClient';
import { Product } from '../models/Product';

const PRODUCT_ENDPOINTS = {
  products: '/products',
  productById: (id: number | string) => `/products/${id}`
} as const;

export class ProductApiClient extends BaseApiClient {
  public async getProducts(query?: { search?: string; page?: number; pageSize?: number }): Promise<Product[]> {
    return this.get<Product[]>(PRODUCT_ENDPOINTS.products, { params: query });
  }

  public async getProductDetails(productId: number | string): Promise<Product> {
    return this.get<Product>(PRODUCT_ENDPOINTS.productById(productId));
  }
}
