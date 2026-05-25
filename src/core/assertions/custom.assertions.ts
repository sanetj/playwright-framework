import { expect, type APIResponse, type Locator } from '@playwright/test';

export class CustomAssertions {
  public static async expectStatus(response: APIResponse, status: number): Promise<void> {
    expect(response.status(), `Expected status ${status}`).toBe(status);
  }

  public static async expectText(locator: Locator, expectedText: string): Promise<void> {
    await expect(locator).toHaveText(expectedText);
  }

  public static expectDeepPartial<T extends object>(actual: T, expectedPartial: Partial<T>): void {
    (expect(actual) as unknown as {
      toEqual(value: unknown): void;
    }).toEqual(
      expect.objectContaining(expectedPartial)
    );
  }
}
