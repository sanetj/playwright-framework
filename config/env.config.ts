import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export interface FrameworkEnv {
  nodeEnv: string;
  appBaseUrl: string;
  apiBaseUrl: string;
  defaultTimeoutMs: number;
  expectTimeoutMs: number;
  retries: number;
  workers: number;
  headless: boolean;
  traceMode: 'on' | 'off' | 'retain-on-failure' | 'on-first-retry';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const REQUIRED_KEYS = ['APP_BASE_URL', 'API_BASE_URL'] as const;

function loadEnvironmentFiles(): void {
  const root = process.cwd();
  const environmentName = process.env.TEST_ENV ?? 'dev';
  const defaultEnvPath = path.resolve(root, '.env');
  const scopedEnvPath = path.resolve(root, 'config/env', `${environmentName}.env`);

  if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath });
  }
  if (fs.existsSync(scopedEnvPath)) {
    dotenv.config({ path: scopedEnvPath, override: true });
  }
}

function assertRequired(): void {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

loadEnvironmentFiles();
assertRequired();

export const env: FrameworkEnv = {
  nodeEnv: process.env.NODE_ENV ?? 'test',
  appBaseUrl: process.env.APP_BASE_URL!,
  apiBaseUrl: process.env.API_BASE_URL!,
  defaultTimeoutMs: parseNumber(process.env.DEFAULT_TIMEOUT_MS, 30_000),
  expectTimeoutMs: parseNumber(process.env.EXPECT_TIMEOUT_MS, 10_000),
  retries: parseNumber(process.env.RETRIES, 1),
  workers: parseNumber(process.env.WORKERS, 4),
  headless: parseBoolean(process.env.HEADLESS, true),
  traceMode: (process.env.TRACE_MODE as FrameworkEnv['traceMode']) ?? 'retain-on-failure',
  logLevel: (process.env.LOG_LEVEL as FrameworkEnv['logLevel']) ?? 'info'
};
