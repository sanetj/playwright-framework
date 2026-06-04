import { test, expect } from '@playwright/test';
import { ReplayRequestBuilder, ReplayResultSerializer, ReplayRequestDefinition } from '../replay-execution-runtime';
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

test.describe('Phase 11.1B-B — Replay Result Serializer Unit Tests', () => {
  let serializer: ReplayResultSerializer;
  let mockRequest: ReplayRequestDefinition;

  test.beforeEach(() => {
    serializer = new ReplayResultSerializer();
    mockRequest = {
      url: 'http://localhost:3000/api/Addresss/8',
      method: 'GET',
      headers: [
        { name: 'Accept', value: 'application/json' },
        { name: 'Authorization', value: 'Bearer attacker_secret' }
      ],
      planId: 'plan_b1',
      bundleId: 'b1',
      assemblyId: 'asm1',
      baselineExchangeId: 'ex1',
      replayCandidateId: 'cand1'
    };
  });

  test('1. Successful serialization constructs correct outputs', () => {
    const response = {
      statusCode: 200,
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      bodyStr: '{"id": 8}'
    };
    const diagnostics = {
      observedResponseTimeMs: 120,
      clientEngine: 'chromium'
    };

    const result = serializer.serializeResult(mockRequest, 'SUCCESS', response, undefined, diagnostics);

    expect(result.resultId).toBe('result_plan_b1');
    expect(result.executionStatus).toBe('SUCCESS');
    expect(result.responseReceived?.statusCode).toBe(200);
    expect(result.responseReceived?.bodyStr).toBe('{"id": 8}');
  });

  test('2. Evidence and diagnostics separation keeps timing out of core response', () => {
    const response = {
      statusCode: 200,
      headers: [],
      bodyStr: ''
    };
    const diagnostics = {
      observedResponseTimeMs: 45,
      clientEngine: 'webkit'
    };

    const result = serializer.serializeResult(mockRequest, 'SUCCESS', response, undefined, diagnostics);

    // Diagnostics are strictly segregated
    expect(result.diagnostics.observedResponseTimeMs).toBe(45);
    expect(result.diagnostics.clientEngine).toBe('webkit');
    expect((result.responseReceived as any)?.observedResponseTimeMs).toBeUndefined();
  });

  test('3. Authorization header redaction case-insensitively redacts token values', () => {
    const result = serializer.serializeResult(mockRequest, 'SUCCESS');
    const authHeader = result.requestSent.headers.find(h => h.name === 'Authorization');
    expect(authHeader?.value).toBe('[REDACTED]');
  });

  test('4. Cookie and Set-Cookie redaction processes both request/response headers', () => {
    const reqWithCookie: ReplayRequestDefinition = {
      ...mockRequest,
      headers: [{ name: 'Cookie', value: 'session=abc' }]
    };
    const response = {
      statusCode: 200,
      headers: [{ name: 'Set-Cookie', value: 'session=xyz' }]
    };

    const result = serializer.serializeResult(reqWithCookie, 'SUCCESS', response);
    
    expect(result.requestSent.headers.find(h => h.name === 'Cookie')?.value).toBe('[REDACTED]');
    expect(result.responseReceived?.headers.find(h => h.name === 'Set-Cookie')?.value).toBe('[REDACTED]');
  });

  test('5. Prefix-based redaction covers custom x-api- and x-auth- headers', () => {
    const reqWithPrefixHeaders: ReplayRequestDefinition = {
      ...mockRequest,
      headers: [
        { name: 'X-Api-Key', value: 'secret-key-val' },
        { name: 'X-Auth-Token-Id', value: 'my-id' }
      ]
    };

    const result = serializer.serializeResult(reqWithPrefixHeaders, 'SUCCESS');
    
    expect(result.requestSent.headers.find(h => h.name === 'X-Api-Key')?.value).toBe('[REDACTED]');
    expect(result.requestSent.headers.find(h => h.name === 'X-Auth-Token-Id')?.value).toBe('[REDACTED]');
  });

  test('6. Substring-based redaction covers secret/password/token/session keywords', () => {
    const reqWithSubstrings: ReplayRequestDefinition = {
      ...mockRequest,
      headers: [
        { name: 'custom-session-identifier', value: 'sess-val' },
        { name: 'db-password', value: 'pass-val' },
        { name: 'auth-secret', value: 'sec-val' }
      ]
    };

    const result = serializer.serializeResult(reqWithSubstrings, 'SUCCESS');

    expect(result.requestSent.headers.find(h => h.name === 'custom-session-identifier')?.value).toBe('[REDACTED]');
    expect(result.requestSent.headers.find(h => h.name === 'db-password')?.value).toBe('[REDACTED]');
    expect(result.requestSent.headers.find(h => h.name === 'auth-secret')?.value).toBe('[REDACTED]');
  });

  test('7. Failure serialization maps timeout, unreachable, and custom execution errors', () => {
    const error = {
      category: 'TIMEOUT' as const,
      message: 'Request timed out after 5000ms'
    };

    const result = serializer.serializeResult(mockRequest, 'FAILED', undefined, error);
    
    expect(result.executionStatus).toBe('FAILED');
    expect(result.failureCategory).toBe('TIMEOUT');
    expect(result.failureMessage).toBe('Request timed out after 5000ms');
    expect(result.responseReceived).toBeUndefined();
  });

  test('8. Traceability preservation guarantees trace IDs flow unchanged', () => {
    const result = serializer.serializeResult(mockRequest, 'SUCCESS');
    
    expect(result.planId).toBe('plan_b1');
    expect(result.bundleId).toBe('b1');
    expect(result.assemblyId).toBe('asm1');
    expect(result.baselineExchangeId).toBe('ex1');
    expect(result.replayCandidateId).toBe('cand1');
  });

  test('9. Deterministic repeated serialization ensures byte-identical representation', () => {
    const response = {
      statusCode: 200,
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      bodyStr: '{"ok": true}'
    };
    const diagnostics = {
      observedResponseTimeMs: 12,
      clientEngine: 'firefox'
    };

    const res1 = serializer.serializeResult(mockRequest, 'SUCCESS', response, undefined, diagnostics);
    const res2 = serializer.serializeResult(mockRequest, 'SUCCESS', response, undefined, diagnostics);

    expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
    expect(Object.isFrozen(res1)).toBe(true);
    expect(Object.isFrozen(res1.requestSent)).toBe(true);
    expect(Object.isFrozen(res1.requestSent.headers)).toBe(true);
  });
});
