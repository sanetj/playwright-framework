import { BrowserContext, Page } from '@playwright/test';

export interface InstrumentationHooks {
  onConsole: (msg: string) => void;
  onDomMutation: (payload: { route: string; summary: string }) => void;
  onStorageAccess: (payload: { storage: string; key: string }) => void;
}

export async function attachBrowserInstrumentation(
  context: BrowserContext,
  page: Page,
  hooks: InstrumentationHooks,
): Promise<void> {
  context.on('page', (p) => {
    p.on('console', (message) => hooks.onConsole(message.text()));
  });

  page.on('console', (message) => hooks.onConsole(message.text()));

  await page.addInitScript(() => {
    const observer = new MutationObserver((mutations) => {
      const summary = mutations.map((m) => `${m.type}:${(m.target as Element)?.nodeName ?? 'node'}`).slice(0, 8).join(', ');
      // @ts-expect-error runtime bridge
      window.__INTEL_MUTATION_HOOK__?.({ route: location.pathname, summary });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

    const wrapStorage = (name: 'localStorage' | 'sessionStorage') => {
      const store = window[name];
      const originalSet = store.setItem.bind(store);
      store.setItem = (key: string, value: string) => {
        // @ts-expect-error runtime bridge
        window.__INTEL_STORAGE_HOOK__?.({ storage: name, key });
        return originalSet(key, value);
      };
    };

    wrapStorage('localStorage');
    wrapStorage('sessionStorage');
  });

  await page.exposeFunction('__INTEL_MUTATION_HOOK__', hooks.onDomMutation);
  await page.exposeFunction('__INTEL_STORAGE_HOOK__', hooks.onStorageAccess);
}
