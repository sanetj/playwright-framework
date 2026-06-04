import { test, expect } from '@playwright/test';
import { ReplayRequestBuilder } from '../replay-execution-runtime';
import { ReplayExecutionPlan } from '../replay-execution-plan';
import { ReplayExecutionContext, CredentialVaultResolver } from '../replay-execution-result';

class MockCredentialResolver implements CredentialVaultResolver {
  private store = new Map<string, { name: string; value: string }[]>();

  public register(authContextId: string, headers: { name: string; value: string }[]) {
    this.store.set(authContextId, headers);
  }

  public async resolveCredentials(authContextId: string) {
    const headers = this.store.get(authContextId);
    if (!headers) {
      return { headers: null as any };
    }
    return { headers };
  }
}

function createMockPlan(data: Partial<ReplayExecutionPlan> = {}): ReplayExecutionPlan {
  return {
    planId: 'plan_b1',
    bundleId: 'b1',
    assemblyId: 'asm1',
    baselineExchangeId: 'ex1',
    subjectAuthContext: 'usr_attacker',
    ownerResourceContext: {
      ownerId: 'usr_owner',
      targetResourceId: '8'
    },
    allowedMethod: 'GET',
    targetResourceFamily: '/api/Addresss/:id',
    targetResourceId: '8',
    replayCandidateId: 'cand1',
    requestTemplate: {
      method: 'GET',
      pathTemplate: '/api/Addresss/:id',
      concretePath: '/api/Addresss/8',
      headers: [{ name: 'Accept', value: 'application/json' }]
    },
    ...data
  };
}

test.describe('Phase 11.1B-A — Replay Request Builder Unit Tests', () => {
  let builder: ReplayRequestBuilder;
  let mockResolver: MockCredentialResolver;

  test.beforeEach(() => {
    builder = new ReplayRequestBuilder();
    mockResolver = new MockCredentialResolver();
  });

  test('1. Successful request build with merged headers', async () => {
    mockResolver.register('usr_attacker', [{ name: 'Cookie', value: 'session=attacker_cookie' }]);

    const plan = createMockPlan();
    const context: ReplayExecutionContext = {
      targetBaseUrl: 'http://localhost:3000',
      timeoutMs: 5000,
      credentialResolver: mockResolver,
      globalHeaders: [{ name: 'X-Test-Header', value: 'global_val' }]
    };

    const requestDef = await builder.buildRequest(plan, context);

    expect(requestDef.url).toBe('http://localhost:3000/api/Addresss/8');
    expect(requestDef.method).toBe('GET');
    
    // Headers must be merged and sorted alphabetically by name
    expect(requestDef.headers.length).toBe(3);
    expect(requestDef.headers[0].name).toBe('Accept');
    expect(requestDef.headers[1].name).toBe('Cookie');
    expect(requestDef.headers[2].name).toBe('X-Test-Header');
  });

  test('2. Auth context resolution updates credentials dynamically', async () => {
    mockResolver.register('usr_attacker', [{ name: 'Authorization', value: 'Bearer attacker_token' }]);

    const plan = createMockPlan();
    const context: ReplayExecutionContext = {
      targetBaseUrl: 'https://test-server.io/',
      timeoutMs: 5000,
      credentialResolver: mockResolver
    };

    const requestDef = await builder.buildRequest(plan, context);
    expect(requestDef.url).toBe('https://test-server.io/api/Addresss/8');
    
    const authHeader = requestDef.headers.find(h => h.name === 'Authorization');
    expect(authHeader).toBeDefined();
    expect(authHeader?.value).toBe('Bearer attacker_token');
  });

  test('3. Missing auth context rejection throws error', async () => {
    // Register nothing for attacker
    const plan = createMockPlan();
    const context: ReplayExecutionContext = {
      targetBaseUrl: 'http://localhost:3000',
      timeoutMs: 5000,
      credentialResolver: mockResolver
    };

    await expect(builder.buildRequest(plan, context)).rejects.toThrow(/UNRESOLVED_AUTH_CONTEXT/);
  });

  test('4. Unsupported method rejection (GET/HEAD only)', async () => {
    mockResolver.register('usr_attacker', []);

    // Allowed method mutated
    const planUnsafeAllowed = createMockPlan({ allowedMethod: 'POST' as any });
    const context: ReplayExecutionContext = {
      targetBaseUrl: 'http://localhost:3000',
      timeoutMs: 5000,
      credentialResolver: mockResolver
    };

    await expect(builder.buildRequest(planUnsafeAllowed, context)).rejects.toThrow(/UNSUPPORTED_METHOD/);

    // Template method mutated
    const planUnsafeTemplate = createMockPlan({
      requestTemplate: {
        method: 'POST' as any,
        pathTemplate: '/api/Addresss/:id',
        concretePath: '/api/Addresss/8',
        headers: []
      }
    });
    await expect(builder.buildRequest(planUnsafeTemplate, context)).rejects.toThrow(/UNSUPPORTED_METHOD/);
  });

  test('5. Target URL validation (missing or invalid scheme)', async () => {
    mockResolver.register('usr_attacker', []);
    const plan = createMockPlan();

    // Missing target base URL
    const contextMissing: ReplayExecutionContext = {
      targetBaseUrl: '',
      timeoutMs: 5000,
      credentialResolver: mockResolver
    };
    await expect(builder.buildRequest(plan, contextMissing)).rejects.toThrow(/MISSING_TARGET_BASE_URL/);

    // Invalid scheme target URL
    const contextInvalid: ReplayExecutionContext = {
      targetBaseUrl: 'ftp://localhost:21',
      timeoutMs: 5000,
      credentialResolver: mockResolver
    };
    await expect(builder.buildRequest(plan, contextInvalid)).rejects.toThrow(/INVALID_TARGET_BASE_URL/);
  });

  test('6. Traceability preservation guarantees immutable lineage fields', async () => {
    mockResolver.register('usr_attacker', []);
    const plan = createMockPlan();
    const context: ReplayExecutionContext = {
      targetBaseUrl: 'http://localhost:3000',
      timeoutMs: 5000,
      credentialResolver: mockResolver
    };

    const requestDef = await builder.buildRequest(plan, context);
    expect(requestDef.planId).toBe(plan.planId);
    expect(requestDef.bundleId).toBe(plan.bundleId);
    expect(requestDef.assemblyId).toBe(plan.assemblyId);
    expect(requestDef.baselineExchangeId).toBe(plan.baselineExchangeId);
    expect(requestDef.replayCandidateId).toBe(plan.replayCandidateId);
  });

  test('7. Deterministic repeated builds yield identical output structures', async () => {
    mockResolver.register('usr_attacker', [{ name: 'Cookie', value: 'session=attacker_cookie' }]);
    const plan = createMockPlan();
    const context: ReplayExecutionContext = {
      targetBaseUrl: 'http://localhost:3000',
      timeoutMs: 5000,
      credentialResolver: mockResolver,
      globalHeaders: [{ name: 'X-Header', value: 'val' }]
    };

    const res1 = await builder.buildRequest(plan, context);
    const res2 = await builder.buildRequest(plan, context);

    expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
    expect(Object.isFrozen(res1)).toBe(true);
    expect(Object.isFrozen(res1.headers)).toBe(true);
  });
});
