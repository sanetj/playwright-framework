import crypto from 'node:crypto';
import { faker } from '@faker-js/faker';

export interface UserFactoryData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  password: string;
}

export class UserFactory {
  public static create(overrides: Partial<UserFactoryData> = {}): UserFactoryData {
    const unique = `${Date.now()}-${crypto.randomUUID()}`;
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email({ firstName: 'qa', lastName: unique.replace(/[^a-zA-Z0-9]/g, '') }).toLowerCase(),
      phoneNumber: faker.phone.number(),
      address: faker.location.streetAddress(),
      password: `Pw_${unique}`,
      ...overrides
    };
  }
}
