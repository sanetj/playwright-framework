import { dataFixture } from './dataFixture';

export interface DbClient {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
}

export interface DbFixture {
  dbClient: DbClient;
}

class DatabaseClient implements DbClient {
  private connected = false;

  public async connect(): Promise<void> {
    this.connected = true;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }
}

export const dbFixture = dataFixture.extend<DbFixture>({
  dbClient: async ({}, use) => {
    const dbClient = new DatabaseClient();
    await dbClient.connect();
    await use(dbClient);
    await dbClient.disconnect();
  }
});

export { expect } from '@playwright/test';
