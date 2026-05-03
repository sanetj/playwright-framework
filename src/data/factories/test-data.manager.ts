import crypto from 'node:crypto';

export interface UserData {
  email: string;
  firstName: string;
  lastName: string;
}

export class TestDataManager {
  public createUser(overrides: Partial<UserData> = {}): UserData {
    const random = crypto.randomBytes(3).toString('hex');
    return {
      email: `qa.user.${random}@mail.test`,
      firstName: 'QA',
      lastName: `User${random}`,
      ...overrides
    };
  }
}

export const testDataManager = new TestDataManager();
