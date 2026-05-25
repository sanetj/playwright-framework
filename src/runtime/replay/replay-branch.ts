import { BrowserContext, Page } from '@playwright/test';

export interface ReplayStateSnapshot {
  sessionId: string;
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  currentUrl: string;
}

export interface ReplayStateFork {
  forkId: string;
  originalSessionId: string;
  snapshot: ReplayStateSnapshot;
  browserContext: BrowserContext;
  page: Page;
}

export class ReplayBranchContext {
  /**
   * Captures the state of an existing Playwright context to create a snapshot.
   */
  public async captureSnapshot(sessionId: string, page: Page): Promise<ReplayStateSnapshot> {
    const cookies = await page.context().cookies();
    
    // Extract storage state
    const storageState = await page.evaluate(() => {
      const ls: Record<string, string> = {};
      const ss: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) ls[key] = localStorage.getItem(key) || '';
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) ss[key] = sessionStorage.getItem(key) || '';
      }
      return { ls, ss };
    });

    return {
      sessionId,
      cookies,
      localStorage: storageState.ls,
      sessionStorage: storageState.ss,
      currentUrl: page.url()
    };
  }

  /**
   * Forks a new deterministic replay branch by restoring the snapshot into a fresh context.
   */
  public async forkSession(
    snapshot: ReplayStateSnapshot, 
    newContext: BrowserContext, 
    newPage: Page
  ): Promise<ReplayStateFork> {
    const forkId = `fork_${snapshot.sessionId}_${Date.now()}`;

    // Restore cookies
    await newContext.addCookies(snapshot.cookies);

    // Navigate to original URL to ensure origin is correct before setting storage
    await newPage.goto(snapshot.currentUrl, { waitUntil: 'domcontentloaded' });

    // Restore storage
    await newPage.evaluate((storage) => {
      for (const [key, value] of Object.entries(storage.ls)) {
        localStorage.setItem(key, value);
      }
      for (const [key, value] of Object.entries(storage.ss)) {
        sessionStorage.setItem(key, value);
      }
    }, { ls: snapshot.localStorage, ss: snapshot.sessionStorage });

    return {
      forkId,
      originalSessionId: snapshot.sessionId,
      snapshot,
      browserContext: newContext,
      page: newPage
    };
  }
}
