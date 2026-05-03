import fs from 'node:fs';
import path from 'node:path';
import { env } from '@config/env.config';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export class Logger {
  private readonly scope: string;
  private readonly threshold: number;
  private readonly filePath: string;

  public constructor(scope: string) {
    this.scope = scope;
    this.threshold = LEVEL_WEIGHT[env.logLevel];
    this.filePath = path.resolve(process.cwd(), 'artifacts/logs/framework.log');
  }

  public debug(message: string, meta?: Record<string, unknown>): void { this.log('debug', message, meta); }
  public info(message: string, meta?: Record<string, unknown>): void { this.log('info', message, meta); }
  public warn(message: string, meta?: Record<string, unknown>): void { this.log('warn', message, meta); }
  public error(message: string, meta?: Record<string, unknown>): void { this.log('error', message, meta); }

  private log(level: Level, message: string, meta?: Record<string, unknown>): void {
    if (LEVEL_WEIGHT[level] < this.threshold) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      scope: this.scope,
      message,
      ...(meta ? { meta } : {})
    };
    const serialized = `${JSON.stringify(entry)}\n`;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.appendFileSync(this.filePath, serialized, 'utf8');
    process.stdout.write(serialized);
  }
}

export const createLogger = (scope: string): Logger => new Logger(scope);
