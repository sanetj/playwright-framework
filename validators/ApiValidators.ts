import { expect, APIResponse } from '@playwright/test';

export class ApiValidators {
  public static async expectStatus(response: APIResponse, expectedStatus: number): Promise<void> {
    expect(response.status(), `Expected status ${expectedStatus} but got ${response.status()}`).toBe(expectedStatus);
  }

  public static expectHasKeys<T extends object>(actual: T, keys: Array<keyof T>): void {
    for (const key of keys) {
      expect(actual, `Missing key in response: ${String(key)}`).toHaveProperty(String(key));
    }
  }

  public static expectArrayNotEmpty<T>(actual: T[]): void {
    expect(Array.isArray(actual)).toBeTruthy();
    expect(actual.length).toBeGreaterThan(0);
  }

  public static expectFieldValue<T extends object, K extends keyof T>(actual: T, field: K, expected: T[K]): void {
    expect(actual[field]).toEqual(expected);
  }
}
