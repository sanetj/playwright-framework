/**
 * Real replay capture fixture adapters for Phase RV.1B and RV.2.
 * Converts captured Playwright exchanges into deterministic replay inputs.
 * Normalizes cookies, headers ordering, and strips transient runtime fields.
 */

export interface NormalizedReplayInput {
  readonly method: string;
  readonly url: string;
  readonly headers: ReadonlyArray<{ readonly name: string; readonly value: string }>;
  readonly bodyStr?: string;
}

export class ReplayCaptureAdapter {
  private readonly transientHeaders: ReadonlyArray<string> = [
    'cf-ray',
    'traceparent',
    'x-request-id',
    'date',
    'etag',
    'request-id',
    'trace-id',
    'x-trace-id',
    'x-render-id',
    'connection',
    'upgrade',
    'transfer-encoding',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
    'sec-fetch-dest',
    'sec-fetch-mode',
    'sec-fetch-site',
    'sec-fetch-user',
    'x-cdn-routing'
  ];

  private readonly transientCookieNames: ReadonlyArray<string> = [
    'csrf',
    'xsrf',
    'csrftoken',
    'xsrftoken',
    'nonce',
    'ts',
    't',
    'token',
    '_'
  ];

  /**
   * Stably normalizes a raw HTTP request, cleaning headers, ordering them lexicographically,
   * and stripping transient/tracking fields.
   */
  public normalizeRequest(request: {
    readonly method: string;
    readonly url: string;
    readonly headers: ReadonlyArray<{ readonly name: string; readonly value: string }>;
    readonly bodyStr?: string;
  }): NormalizedReplayInput {
    const cleanHeaders: Array<{ name: string; value: string }> = [];

    for (const h of request.headers) {
      const lowerName = h.name.toLowerCase();
      if (this.transientHeaders.includes(lowerName)) {
        continue;
      }
      if (lowerName.includes('nonce') || lowerName.includes('traceid') || lowerName.includes('requestid')) {
        continue;
      }

      if (lowerName === 'cookie') {
        const cleanedCookieVal = this.normalizeCookieString(h.value);
        if (cleanedCookieVal.length > 0) {
          cleanHeaders.push({ name: 'cookie', value: cleanedCookieVal });
        }
      } else {
        cleanHeaders.push({ name: lowerName, value: h.value });
      }
    }

    // Sort headers alphabetically by name, and then by value to guarantee lexicographical stability
    cleanHeaders.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      if (cmp !== 0) return cmp;
      return a.value.localeCompare(b.value);
    });

    const result: NormalizedReplayInput = {
      method: request.method.toUpperCase(),
      url: request.url,
      headers: cleanHeaders,
      bodyStr: request.bodyStr
    };

    // Deep freeze the result
    return this.deepFreeze(result);
  }

  /**
   * Normalizes a cookie header string by sorting individual cookies and stripping transient/dynamic keys.
   */
  private normalizeCookieString(cookieVal: string): string {
    if (!cookieVal) return '';
    const parts = cookieVal.split(';');
    const cookiesList: Array<{ name: string; value: string }> = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const equalsIdx = trimmed.indexOf('=');
      if (equalsIdx === -1) {
        cookiesList.push({ name: trimmed, value: '' });
      } else {
        const name = trimmed.substring(0, equalsIdx);
        const value = trimmed.substring(equalsIdx + 1);
        cookiesList.push({ name, value });
      }
    }

    // Filter out dynamic/transient cookie names
    const filtered = cookiesList.filter(c => {
      const lowerName = c.name.toLowerCase();
      if (this.transientCookieNames.includes(lowerName)) return false;
      return true;
    });

    // Sort alphabetically by cookie name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered.map(c => `${c.name}=${c.value}`).join('; ');
  }

  private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    const rec = obj as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(obj)) {
      const prop = rec[key];
      if (prop !== null && typeof prop === 'object') {
        this.deepFreeze(prop);
      }
    }
    return Object.freeze(obj);
  }
}
