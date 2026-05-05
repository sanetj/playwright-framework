import crypto from 'node:crypto';
import { faker } from '@faker-js/faker';

export interface OrderFactoryData {
  orderReference: string;
  city: string;
  zipPostalCode: string;
}

export class OrderFactory {
  public static create(overrides: Partial<OrderFactoryData> = {}): OrderFactoryData {
    return {
      orderReference: `ORD-${Date.now()}-${crypto.randomUUID()}`,
      city: faker.location.city(),
      zipPostalCode: faker.location.zipCode(),
      ...overrides
    };
  }
}
