import { Pool, QueryResult } from 'pg';

export class DatabaseClient {
  private pool: Pool;

  public constructor() {
    this.pool = new Pool({
      connectionString: process.env.DB_CONNECTION_STRING,
      max: Number(process.env.DB_POOL_MAX ?? 10)
    });
  }

  public async query<T>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  public async disconnect(): Promise<void> {
    await this.pool.end();
  }
}
