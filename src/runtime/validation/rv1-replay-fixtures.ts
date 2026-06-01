import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';

/**
 * Helper to construct deep-frozen mock exchanges for Reality Validation.
 */
function createFrozenExchange(data: {
  id: string;
  sessionId: string;
  method: string;
  url: string;
  reqHeaders: Array<{ name: string; value: string }>;
  reqBody?: string;
  status: number;
  respHeaders: Array<{ name: string; value: string }>;
  respBody?: string;
  timestamp: number;
}): CanonicalHttpExchange {
  const exchange: CanonicalHttpExchange = {
    exchangeId: {
      id: data.id,
      requestFingerprint: `rf_${data.id}`,
      navigationId: 'nav_rv1_mock',
      sequenceNumber: 100
    },
    sessionId: data.sessionId,
    timestamp: data.timestamp,
    durationMs: 45,
    source: 'playwright',
    request: {
      method: data.method,
      url: data.url,
      headers: data.reqHeaders,
      bodyStr: data.reqBody
    },
    response: {
      status: data.status,
      headers: data.respHeaders,
      bodyStr: data.respBody
    }
  };

  // Recursively freeze exchange structure
  const deepFreeze = <T>(obj: T, visited = new WeakSet<Record<string, unknown>>()): T => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    const rec = obj as Record<string, unknown>;
    if (visited.has(rec)) {
      return obj;
    }
    visited.add(rec);
    for (const key of Object.getOwnPropertyNames(obj)) {
      const prop = rec[key];
      if (prop !== null && typeof prop === 'object') {
        deepFreeze(prop, visited);
      }
    }
    return Object.freeze(obj);
  };

  return deepFreeze(exchange);
}

// 1. MOCK_JUICE_SHOP_BAC_EXCHANGE
// Represents an anonymous visitor trying to view administrative administration panel details.
// In the original run, it receives a 403 Forbidden.
export const MOCK_JUICE_SHOP_BAC_EXCHANGE: CanonicalHttpExchange = createFrozenExchange({
  id: 'ex_juice_bac_orig',
  sessionId: 'juice_anonymous',
  method: 'GET',
  url: 'http://localhost:3000/api/administration',
  reqHeaders: [
    { name: 'accept', value: 'application/json' },
    { name: 'user-agent', value: 'Mozilla/5.0' }
  ],
  status: 403,
  respHeaders: [
    { name: 'content-type', value: 'application/json' },
    { name: 'cache-control', value: 'no-store' }
  ],
  respBody: JSON.stringify({ error: 'Access denied: Administrators only' }),
  timestamp: 1716900000000
});

// 2. MOCK_PORTSWIGGER_IDOR_EXCHANGE
// Represents User Account A accessing parameter-based endpoint.
// In the original run, User Account A requests their own invoice.
export const MOCK_PORTSWIGGER_IDOR_EXCHANGE: CanonicalHttpExchange = createFrozenExchange({
  id: 'ex_portswigger_idor_orig',
  sessionId: 'portswigger_user1',
  method: 'GET',
  url: 'http://127.0.0.1:8080/api/invoice?id=1001',
  reqHeaders: [
    { name: 'accept', value: 'application/json' },
    { name: 'authorization', value: 'Bearer user1-token' }
  ],
  status: 200,
  respHeaders: [
    { name: 'content-type', value: 'application/json' }
  ],
  respBody: JSON.stringify({
    invoiceId: 1001,
    owner: 'user1',
    amount: 150.00,
    timestamp: '2026-05-28T09:00:00Z'
  }),
  timestamp: 1716900100000
});

// 3. MOCK_CSRF_REJECTION_EXCHANGE
// Represents an exchange rejected via dynamic CSRF validations.
export const MOCK_CSRF_REJECTION_EXCHANGE: CanonicalHttpExchange = createFrozenExchange({
  id: 'ex_csrf_rejection',
  sessionId: 'juice_user',
  method: 'GET',
  url: 'http://localhost:3000/api/users',
  reqHeaders: [
    { name: 'accept', value: 'application/json' }
  ],
  status: 403,
  respHeaders: [
    { name: 'content-type', value: 'application/json' }
  ],
  respBody: JSON.stringify({
    message: 'CSRF token validation failed',
    status: 'error'
  }),
  timestamp: 1716900200000
});

// 4. MOCK_AUTH_REDIRECT_EXCHANGE
// Represents an exchange dynamically redirecting to login.
export const MOCK_AUTH_REDIRECT_EXCHANGE: CanonicalHttpExchange = createFrozenExchange({
  id: 'ex_auth_redirect',
  sessionId: 'juice_anonymous',
  method: 'GET',
  url: 'http://localhost:3000/api/users',
  reqHeaders: [
    { name: 'accept', value: 'text/html' }
  ],
  status: 302,
  respHeaders: [
    { name: 'location', value: '/login?redirectTo=/api/users&ts=1716900300' }
  ],
  timestamp: 1716900300000
});
