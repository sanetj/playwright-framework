import crypto from 'node:crypto';
import { faker } from '@faker-js/faker';

export interface ProductFactoryData {
  name: string;
  sku: string;
  quantity: number;
}

export class ProductFactory {
  public static create(overrides: Partial<ProductFactoryData> = {}): ProductFactoryData {
    const unique = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    return {
      name: `${faker.commerce.productName()}-${unique}`,
      sku: `SKU-${unique}`,
      quantity: faker.number.int({ min: 1, max: 5 }),
      ...overrides
    };
  }
}
