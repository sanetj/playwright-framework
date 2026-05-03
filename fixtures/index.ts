import { loggerFixture } from './loggerFixture';

export const test = loggerFixture;
export { expect } from '@playwright/test';

export type { PageObjectFixtures, SessionFixtures, WorkerSessionFixtures } from './baseFixture';
export type { ApiFixture } from './apiFixture';
export type { DataFixture, FrameworkTestData, TestUserData, ProductData } from './dataFixture';
export type { DbFixture, DbClient } from './dbFixture';
export type { LoggerFixture } from './loggerFixture';
