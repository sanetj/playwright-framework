import { test, expect } from '@playwright/test';
import { ResourceSignalExtractor } from '../resource-signal-extractor';
import { CanonicalHttpExchange } from '../../../runtime/evidence/canonical-http-evidence';

function createMockExchange(data: {
  id: string;
  sessionId: string;
  url: string;
  method: string;
  status: number;
  bodyStr?: string;
  responseHeaders?: { name: string; value: string }[];
}): CanonicalHttpExchange {
  return {
    exchangeId: { id: data.id, requestFingerprint: `rf_${data.id}`, navigationId: 'nav_test', sequenceNumber: 100 },
    sessionId: data.sessionId,
    timestamp: 1716930000000,
    durationMs: 40,
    source: 'playwright',
    request: {
      method: data.method,
      url: data.url,
      headers: [{ name: 'accept', value: 'application/json' }],
      bodyStr: data.bodyStr
    },
    response: {
      status: data.status,
      headers: data.responseHeaders || [{ name: 'content-type', value: 'application/json' }],
      bodyStr: '{"ok": true}'
    }
  };
}

test.describe('Phase 10.1A — Resource Signal Extraction Unit Tests', () => {
  let extractor: ResourceSignalExtractor;

  test.beforeEach(() => {
    extractor = new ResourceSignalExtractor();
  });

  test('1. Resource family normalization checks', () => {
    const norm1 = extractor.normalizeUrlToFamily('http://localhost:3000/rest/basket/42');
    expect(norm1.family).toBe('/rest/basket/:basketId');
    expect(norm1.surface).toBe('Basket Surface');

    const norm2 = extractor.normalizeUrlToFamily('http://localhost:3000/api/invoice/1005');
    expect(norm2.family).toBe('/api/invoice/:invoiceId');
    expect(norm2.surface).toBe('Invoice Surface');

    const norm3 = extractor.normalizeUrlToFamily('http://localhost:3000/rest/user/99');
    expect(norm3.family).toBe('/rest/user/:userId');
    expect(norm3.surface).toBe('User Surface');

    const norm4 = extractor.normalizeUrlToFamily('http://localhost:3000/api/administration');
    expect(norm4.family).toBe('/api/administration');
    expect(norm4.surface).toBe('Administration Surface');

    const norm5 = extractor.normalizeUrlToFamily('http://localhost:3000/rest/products/55');
    expect(norm5.family).toBe('/rest/products/:id');
    expect(norm5.surface).toBe('Products Surface');

    const norm6 = extractor.normalizeUrlToFamily('http://localhost:3000/api/items/550e8400-e29b-41d4-a716-446655440000');
    expect(norm6.family).toBe('/api/items/:uuid');
    expect(norm6.surface).toBe('Items Surface');
  });

  test('2. Signature stability (human-readable format)', () => {
    const exchanges = [
      createMockExchange({
        id: 'ex1',
        sessionId: 'user_a',
        url: 'http://localhost:3000/rest/basket/5',
        method: 'GET',
        status: 200
      })
    ];

    const inventory = extractor.extractInventory(exchanges);
    expect(inventory.signals.length).toBe(1);
    expect(inventory.signals[0].resourceSignature).toBe('GET::/rest/basket/:basketId');
    expect(inventory.signals[0].resourceFamily).toBe('/rest/basket/:basketId');
    expect(inventory.signals[0].httpMethod).toBe('GET');
  });

  test('3. Surface assignment and taxonomy categories', () => {
    const exchanges = [
      createMockExchange({
        id: 'ex1',
        sessionId: 'user_a',
        url: 'http://localhost:3000/rest/basket/5',
        method: 'GET',
        status: 200
      }),
      createMockExchange({
        id: 'ex2',
        sessionId: 'user_b',
        url: 'http://localhost:3000/api/invoice/1002',
        method: 'GET',
        status: 200
      })
    ];

    const inventory = extractor.extractInventory(exchanges);
    expect(inventory.signals.length).toBe(2);

    const basketSig = inventory.signals.find(s => s.resourceFamily === '/rest/basket/:basketId');
    expect(basketSig).toBeDefined();
    expect(basketSig!.primaryType).toBe('USER');
    expect(basketSig!.authorizationSurface).toBe('Basket Surface');

    const invoiceSig = inventory.signals.find(s => s.resourceFamily === '/api/invoice/:invoiceId');
    expect(invoiceSig).toBeDefined();
    expect(invoiceSig!.primaryType).toBe('BILLING');
    expect(invoiceSig!.authorizationSurface).toBe('Invoice Surface');
  });

  test('4. Investigation signal extraction', () => {
    const exchanges = [
      createMockExchange({
        id: 'ex1',
        sessionId: 'user_a',
        url: 'http://localhost:3000/rest/basket/1?promoCode=summer',
        method: 'GET',
        status: 200,
        bodyStr: '{"itemsCount": 2}'
      }),
      createMockExchange({
        id: 'ex2',
        sessionId: 'user_b',
        url: 'http://localhost:3000/rest/basket/1?tenantId=t-a',
        method: 'GET',
        status: 200
      }),
      createMockExchange({
        id: 'ex3',
        sessionId: 'admin_user',
        url: 'http://localhost:3000/api/administration',
        method: 'POST',
        status: 200
      }),
      createMockExchange({
        id: 'ex4',
        sessionId: 'user_a',
        url: 'http://localhost:3000/api/invoice/download/12',
        method: 'GET',
        status: 200,
        responseHeaders: [{ name: 'content-disposition', value: 'attachment; filename="invoice.pdf"' }]
      })
    ];

    const inventory = extractor.extractInventory(exchanges);

    // Basket Route: contains params 'promoCode', 'tenantId', 'itemsCount'
    // Stably sorted parameterSignature should be ['itemsCount', 'promoCode', 'tenantId']
    const basketSig = inventory.signals.find(s => s.resourceFamily === '/rest/basket/:basketId');
    expect(basketSig).toBeDefined();
    expect(basketSig!.parameterSignature).toEqual(['itemsCount', 'promoCode', 'tenantId']);
    expect(basketSig!.investigationSignals).toContain('OBJECT_IDENTIFIER_PRESENT');
    expect(basketSig!.investigationSignals).toContain('CROSS_ROLE_VISIBLE'); // Hit by user_a and user_b
    expect(basketSig!.investigationSignals).toContain('TENANT_SCOPED'); // 'tenantId' param present

    // Admin Route: BOUNDARY_ADJACENT should be active
    const adminSig = inventory.signals.find(s => s.resourceFamily === '/api/administration');
    expect(adminSig).toBeDefined();
    expect(adminSig!.investigationSignals).toContain('BOUNDARY_ADJACENT');

    // Download/Invoice Route: DOWNLOAD_CAPABLE should be active
    const downloadSig = inventory.signals.find(s => s.resourceFamily === '/api/invoice/download/:id');
    expect(downloadSig).toBeDefined();
    expect(downloadSig!.investigationSignals).toContain('DOWNLOAD_CAPABLE');
  });

  test('5. Deterministic ordering & Byte-identical repeated outputs', () => {
    const exchanges = [
      createMockExchange({
        id: 'ex_z',
        sessionId: 'user_a',
        url: 'http://localhost:3000/rest/user/1',
        method: 'GET',
        status: 200
      }),
      createMockExchange({
        id: 'ex_a',
        sessionId: 'user_a',
        url: 'http://localhost:3000/rest/basket/1',
        method: 'GET',
        status: 200
      })
    ];

    // Extraction 1
    const inventory1 = extractor.extractInventory(exchanges);

    // Extraction 2
    const inventory2 = extractor.extractInventory(exchanges);

    // Flat signals array must be sorted alphabetically by resourceSignature
    expect(inventory1.signals[0].resourceSignature).toBe('GET::/rest/basket/:basketId');
    expect(inventory1.signals[1].resourceSignature).toBe('GET::/rest/user/:userId');

    // Repeated executions must yield 100% byte-identical, frozen-ready JSON output
    const str1 = JSON.stringify(inventory1);
    const str2 = JSON.stringify(inventory2);
    expect(str1).toBe(str2);

    // Timestamps check: Ensure absolutely zero 'generatedAt' or clock fields exist
    expect((inventory1 as any).generatedAt).toBeUndefined();
    expect((inventory2 as any).generatedAt).toBeUndefined();
  });
});
