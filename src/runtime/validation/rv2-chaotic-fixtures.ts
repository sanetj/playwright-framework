import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';

function createChaoticExchange(data: {
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
      navigationId: 'nav_rv2_chaotic_mock',
      sequenceNumber: 200
    },
    sessionId: data.sessionId,
    timestamp: data.timestamp,
    durationMs: 60,
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

// 1. MOCK_ROTATING_AUTH_EXCHANGE
// Represents an API request containing rotating authorization header tokens.
export const MOCK_ROTATING_AUTH_EXCHANGE: CanonicalHttpExchange = createChaoticExchange({
  id: 'ex_rotating_auth',
  sessionId: 'juice_user_rotating',
  method: 'GET',
  url: 'http://localhost:3000/api/users/current',
  reqHeaders: [
    { name: 'authorization', value: 'Bearer initial-rotating-token-123' },
    { name: 'accept', value: 'application/json' }
  ],
  status: 200,
  respHeaders: [
    { name: 'content-type', value: 'application/json' }
  ],
  respBody: JSON.stringify({ userId: 42, role: 'user', authenticated: true }),
  timestamp: 1716920000000
});

// 2. MOCK_DELAYED_REDIRECT_EXCHANGE
// Represents an exchange that simulates delayed redirection inside single-page applications.
export const MOCK_DELAYED_REDIRECT_EXCHANGE: CanonicalHttpExchange = createChaoticExchange({
  id: 'ex_delayed_redirect',
  sessionId: 'juice_anonymous',
  method: 'GET',
  url: 'http://localhost:3000/api/administration',
  reqHeaders: [
    { name: 'accept', value: 'application/json' }
  ],
  status: 403,
  respHeaders: [
    { name: 'content-type', value: 'application/json' }
  ],
  respBody: JSON.stringify({ error: 'Access Denied', redirectUrl: '/login?delay=1&next=/api/administration' }),
  timestamp: 1716920100000
});

// 3. MOCK_SPA_TOKEN_REFRESH_EXCHANGE
// Represents an API call where a token refresh generates dynamic sliding session identifiers.
export const MOCK_SPA_TOKEN_REFRESH_EXCHANGE: CanonicalHttpExchange = createChaoticExchange({
  id: 'ex_spa_token_refresh',
  sessionId: 'juice_user',
  method: 'GET',
  url: 'http://localhost:3000/api/basket/1',
  reqHeaders: [
    { name: 'authorization', value: 'Bearer old-token-abc' },
    { name: 'cookie', value: 'session=cookie-old' }
  ],
  status: 200,
  respHeaders: [
    { name: 'content-type', value: 'application/json' }
  ],
  respBody: JSON.stringify({
    basketId: 1,
    items: [],
    meta: {
      refreshedToken: 'Bearer new-token-xyz',
      nonce: 'n_12345',
      timestamp: '2026-05-28T22:00:00Z'
    }
  }),
  timestamp: 1716920200000
});

// 4. MOCK_INCONSISTENT_QUERY_ORDER_EXCHANGE
// Represents dynamic client routing requests generating mismatched parameter positions.
export const MOCK_INCONSISTENT_QUERY_ORDER_EXCHANGE: CanonicalHttpExchange = createChaoticExchange({
  id: 'ex_inconsistent_query',
  sessionId: 'juice_user',
  method: 'GET',
  url: 'http://localhost:3000/api/feedback?sort=desc&page=1&limit=10',
  reqHeaders: [
    { name: 'accept', value: 'application/json' }
  ],
  status: 200,
  respHeaders: [
    { name: 'content-type', value: 'application/json' }
  ],
  respBody: JSON.stringify({ total: 100, feedback: [] }),
  timestamp: 1716920300000
});

// 5. MOCK_STALE_SESSION_COOKIE_EXCHANGE
// Represents a stale session cookie trigger.
export const MOCK_STALE_SESSION_COOKIE_EXCHANGE: CanonicalHttpExchange = createChaoticExchange({
  id: 'ex_stale_session',
  sessionId: 'juice_user_stale',
  method: 'GET',
  url: 'http://localhost:3000/api/users/profile',
  reqHeaders: [
    { name: 'cookie', value: 'session=stale-expired-value; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT' }
  ],
  status: 401,
  respHeaders: [
    { name: 'content-type', value: 'application/json' }
  ],
  respBody: JSON.stringify({ error: 'Session has expired' }),
  timestamp: 1716920400000
});

// 6. MOCK_MIXED_CDN_HEADERS_EXCHANGE
// Represents responses with inconsistent CDN or gateway tracking headers.
export const MOCK_MIXED_CDN_HEADERS_EXCHANGE: CanonicalHttpExchange = createChaoticExchange({
  id: 'ex_mixed_cdn',
  sessionId: 'juice_user',
  method: 'GET',
  url: 'http://localhost:3000/api/products',
  reqHeaders: [
    { name: 'accept', value: 'application/json' }
  ],
  status: 200,
  respHeaders: [
    { name: 'content-type', value: 'application/json' },
    { name: 'cf-ray', value: 'ray-initial-123' },
    { name: 'x-cdn-routing', value: 'node-us-east-1' },
    { name: 'x-request-id', value: 'req-init-999' }
  ],
  respBody: JSON.stringify([{ id: 1, name: 'Apple Juice' }]),
  timestamp: 1716920500000
});

// 7. MOCK_AUTH_DOWNGRADE_REDIRECT_EXCHANGE
// Represents a request triggering a redirect to login on privilege mismatch.
export const MOCK_AUTH_DOWNGRADE_REDIRECT_EXCHANGE: CanonicalHttpExchange = createChaoticExchange({
  id: 'ex_auth_downgrade',
  sessionId: 'juice_anonymous',
  method: 'GET',
  url: 'http://localhost:3000/api/administration',
  reqHeaders: [
    { name: 'accept', value: 'text/html' }
  ],
  status: 302,
  respHeaders: [
    { name: 'location', value: '/login?error=downgrade&target=%2Fapi%2Fadministration' }
  ],
  timestamp: 1716920600000
});
