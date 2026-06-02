import { test, expect } from '@playwright/test';
import { OwnershipInferencer } from '../ownership-inferencer';
import { CanonicalHttpExchange } from '../../../runtime/evidence/canonical-http-evidence';

function createMockExchange(data: {
  id: string;
  sessionId: string;
  url: string;
  method: string;
  status: number;
  requestHeaders?: { name: string; value: string }[];
  responseHeaders?: { name: string; value: string }[];
  responseBody?: string;
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
      headers: data.requestHeaders || [{ name: 'accept', value: 'application/json' }]
    },
    response: {
      status: data.status,
      headers: data.responseHeaders || [{ name: 'content-type', value: 'application/json' }],
      bodyStr: data.responseBody || '{"ok": true}'
    }
  };
}

test.describe('Phase 10.2 — Ownership Intelligence Unit Tests', () => {
  let inferencer: OwnershipInferencer;

  test.beforeEach(() => {
    inferencer = new OwnershipInferencer();
  });

  test('1. Identity profile reconciliation from self-service profile responses', () => {
    const exchanges = [
      createMockExchange({
        id: 'ex1',
        sessionId: 'session_user_a',
        url: 'http://localhost:3000/rest/user/profile',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 12, "email": "user_a@demo.com", "username": "user_a"}'
      })
    ];

    const result = inferencer.inferOwnership(exchanges);
    
    // Checks that Session User A was successfully resolved to Canonical ID: usr_12
    const observations = result.relationshipsBySubject['usr_12'];
    expect(observations).toBeDefined();
    expect(observations.length).toBeGreaterThan(0);
  });

  test('2. Explicit owner and userId field mapping in payloads', () => {
    const exchanges = [
      // 1. Identity binding exchange
      createMockExchange({
        id: 'ex_identity',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/user/authentication-details',
        method: 'GET',
        status: 200,
        responseBody: '{"id": "user_a", "email": "user_a@demo.com"}'
      }),
      // 2. Resource fetch returning explicit userId in body
      createMockExchange({
        id: 'ex_resource',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/api/invoice/1002',
        method: 'GET',
        status: 200,
        responseBody: '{"invoiceId": 1002, "userId": "user_a", "amount": 150}'
      })
    ];

    const result = inferencer.inferOwnership(exchanges);

    // Verify explicit owner confirmation triggers OWNS and BELONGS_TO relationships
    const ownsObs = result.observations.find(o => o.relationship === 'OWNS' && o.targetResourceId === '1002');
    const belongsObs = result.observations.find(o => o.relationship === 'BELONGS_TO' && o.targetResourceId === '1002');

    expect(ownsObs).toBeDefined();
    expect(belongsObs).toBeDefined();
    expect(ownsObs!.subjectId).toBe('usr_user_a');
  });

  test('3. Self-service ownership mapping promotion', () => {
    const exchanges = [
      createMockExchange({
        id: 'ex1',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/user/profile',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 44, "email": "user_a@demo.com"}'
      })
    ];

    const result = inferencer.inferOwnership(exchanges);

    // Direct profile route is immediately promoted to OWNS
    const obs = result.observations.find(o => o.targetResourceFamily.includes('profile') && o.relationship === 'OWNS');
    expect(obs).toBeDefined();
    expect(obs!.relationship).toBe('OWNS');
  });

  test('4. Tenant and Workspace scoping mapping', () => {
    const exchanges = [
      // 1. Identity binding exchange
      createMockExchange({
        id: 'ex_id',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/user/profile',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 12, "email": "user_a@demo.com"}'
      }),
      // 2. Resource loaded under tenant header and workspace parameters
      createMockExchange({
        id: 'ex_scoped',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/api/invoice/1002?tenantId=tenant_alpha&workspaceId=work_5',
        method: 'GET',
        status: 200,
        requestHeaders: [
          { name: 'accept', value: 'application/json' },
          { name: 'x-tenant-id', value: 'tenant_alpha' }
        ]
      })
    ];

    const result = inferencer.inferOwnership(exchanges);

    // Verify SCOPED_TO Tenant relationship generated
    const tenantScoped = result.observations.find(
      o => o.relationship === 'SCOPED_TO' && o.subjectId === 'tenant_alpha' && o.targetResourceId === '1002'
    );
    expect(tenantScoped).toBeDefined();

    // Verify Session User -> Tenant Membership relationship (MEMBER_OF) generated
    const tenantMember = result.observations.find(
      o => o.relationship === 'MEMBER_OF' && o.subjectId === 'usr_12' && o.targetResourceId === 'tenant_alpha'
    );
    expect(tenantMember).toBeDefined();

    // Verify SCOPED_TO Workspace relationship generated
    const workspaceScoped = result.observations.find(
      o => o.relationship === 'SCOPED_TO' && o.subjectId === 'work_5' && o.targetResourceId === '1002'
    );
    expect(workspaceScoped).toBeDefined();
  });

  test('5. OBSERVED_ACCESS generation and OWNS promotion under User-Scoped Single Access', () => {
    const exchanges = [
      // 1. Identity binding for Session A
      createMockExchange({
        id: 'ex_id_a',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/user/profile',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 12}'
      }),
      // 2. Identity binding for Session B
      createMockExchange({
        id: 'ex_id_b',
        sessionId: 'sess_b',
        url: 'http://localhost:3000/rest/user/profile',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 13}'
      }),
      // 3. Basket 1 accessed exclusively by Session A
      createMockExchange({
        id: 'ex_basket_exclusive',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/basket/1',
        method: 'GET',
        status: 200
      }),
      // 4. Basket 2 accessed by BOTH Session A and Session B (multi-access)
      createMockExchange({
        id: 'ex_basket_shared_1',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/basket/2',
        method: 'GET',
        status: 200
      }),
      createMockExchange({
        id: 'ex_basket_shared_2',
        sessionId: 'sess_b',
        url: 'http://localhost:3000/rest/basket/2',
        method: 'GET',
        status: 200
      })
    ];

    const result = inferencer.inferOwnership(exchanges);

    // Exclusive Basket 1: Promoted to OWNS for User A (usr_12)
    const ownsBasket1 = result.observations.find(
      o => o.subjectId === 'usr_12' && o.targetResourceId === '1' && o.relationship === 'OWNS'
    );
    expect(ownsBasket1).toBeDefined();

    // Multi-access Basket 2: Kept at OBSERVED_ACCESS for both User A (usr_12) and User B (usr_13)
    const accessA = result.observations.find(
      o => o.subjectId === 'usr_12' && o.targetResourceId === '2' && o.relationship === 'OBSERVED_ACCESS'
    );
    const accessB = result.observations.find(
      o => o.subjectId === 'usr_13' && o.targetResourceId === '2' && o.relationship === 'OBSERVED_ACCESS'
    );
    expect(accessA).toBeDefined();
    expect(accessB).toBeDefined();

    // Exclude any forced OWNS relationship for Basket 2
    const forcedOwnsA = result.observations.find(
      o => o.subjectId === 'usr_12' && o.targetResourceId === '2' && o.relationship === 'OWNS'
    );
    expect(forcedOwnsA).toBeUndefined();
  });

  test('6. Deterministic ordering & repeated execution stability', () => {
    const exchanges = [
      createMockExchange({
        id: 'ex2',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/basket/2',
        method: 'GET',
        status: 200
      }),
      createMockExchange({
        id: 'ex1',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/basket/1',
        method: 'GET',
        status: 200
      })
    ];

    const res1 = inferencer.inferOwnership(exchanges);
    const res2 = inferencer.inferOwnership(exchanges);

    // Sorted by observationId
    expect(res1.observations[0].observationId).toBe('obs_OBSERVED_ACCESS_usr_sess_a_rest_basket_basketId_1');
    expect(res1.observations[1].observationId).toBe('obs_OBSERVED_ACCESS_usr_sess_a_rest_basket_basketId_2');

    // Repeated execution must yield identical JSON representations
    const str1 = JSON.stringify(res1);
    const str2 = JSON.stringify(res2);
    expect(str1).toBe(str2);

    // Verify absolutely no timestamps are exported
    expect((res1 as any).generatedAt).toBeUndefined();
  });

  test('7. mechanic/merchant false profile matches avoidance', () => {
    const exchanges = [
      createMockExchange({
        id: 'ex_profile',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/user/profile',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 8, "email": "userA@demo.com"}'
      }),
      createMockExchange({
        id: 'ex_merchant',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/workshop/api/merchant/contact_mechanic',
        method: 'POST',
        status: 200,
        responseBody: '{"id": 6}'
      }),
      createMockExchange({
        id: 'ex_mechanic',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/workshop/api/mechanic/mechanic_report?report_id=7',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 7}'
      })
    ];

    const result = inferencer.inferOwnership(exchanges);

    // Reconciled ID must remain usr_8 and not get corrupted to usr_6 or usr_7
    const resolvedA = result.profiles.find(p => p.sessionIds.includes('sess_a'));
    expect(resolvedA).toBeDefined();
    expect(resolvedA!.resolvedId).toBe('usr_8');
  });

  test('8. order/video ID collisions prevention', () => {
    const exchanges = [
      createMockExchange({
        id: 'ex_profile',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/user/profile',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 8, "email": "userA@demo.com"}'
      }),
      createMockExchange({
        id: 'ex_order',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/workshop/api/shop/orders/6',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 6, "owner": 8}'
      }),
      createMockExchange({
        id: 'ex_video',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/identity/api/v2/user/videos/6',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 6, "owner": 8}'
      })
    ];

    const result = inferencer.inferOwnership(exchanges);

    // Both resources must generate unique observation IDs because family signature is included
    const orderObs = result.observations.find(o => o.targetResourceFamily.includes('orders') && o.relationship === 'OWNS');
    const videoObs = result.observations.find(o => o.targetResourceFamily.includes('videos') && o.relationship === 'OWNS');

    expect(orderObs).toBeDefined();
    expect(videoObs).toBeDefined();
    expect(orderObs!.observationId).not.toBe(videoObs!.observationId);
    expect(orderObs!.observationId).toContain('workshop_api_shop_orders_id');
    expect(videoObs!.observationId).toContain('identity_api_v2_user_videos_id');
  });

  test('9. query parameter concrete ID fallback extraction', () => {
    const exchanges = [
      createMockExchange({
        id: 'ex_profile',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/user/profile',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 8, "email": "userA@demo.com"}'
      }),
      createMockExchange({
        id: 'ex_report',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/workshop/api/mechanic/mechanic_report?report_id=99',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 99, "owner": 8}'
      })
    ];

    const result = inferencer.inferOwnership(exchanges);

    const reportObs = result.observations.find(o => o.targetResourceFamily.includes('mechanic_report') && o.relationship === 'OWNS');
    expect(reportObs).toBeDefined();
    expect(reportObs!.targetResourceId).toBe('99');
    expect(reportObs!.relationship).toBe('OWNS');
  });

  test('10. mixed identifier resource families and non-identifier params exclusion', () => {
    const exchanges = [
      createMockExchange({
        id: 'ex_profile',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/rest/user/profile',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 8, "email": "userA@demo.com"}'
      }),
      createMockExchange({
        id: 'ex_report',
        sessionId: 'sess_a',
        url: 'http://localhost:3000/workshop/api/mechanic/mechanic_report?report_id=99&page=2&limit=10',
        method: 'GET',
        status: 200,
        responseBody: '{"id": 99, "owner": 8}'
      })
    ];

    const result = inferencer.inferOwnership(exchanges);

    const reportObs = result.observations.find(o => o.targetResourceFamily.includes('mechanic_report') && o.relationship === 'OWNS');
    expect(reportObs).toBeDefined();
    // page and limit should be ignored, and only report_id used
    expect(reportObs!.targetResourceId).toBe('99');
  });
});
