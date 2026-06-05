import { test, expect } from '@playwright/test';
import { ReplayRequestBuilder, ReplayResultSerializer, ReplayHttpDispatcher, ReplayRequestDefinition, ReplayExecutionRuntime } from '../replay-execution-runtime';
import { ReplayExecutionPlan } from '../replay-execution-plan';
import { ReplayExecutionContext, CredentialVaultResolver, RawReplayExecutionResponse, HttpTransportAdapter } from '../replay-execution-result';

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

class MockTransportAdapter implements HttpTransportAdapter {
  private handler?: (req: any) => Promise<RawReplayExecutionResponse>;

  public setHandler(handler: (req: any) => Promise<RawReplayExecutionResponse>) {
    this.handler = handler;
  }

  public async sendRequest(req: any): Promise<RawReplayExecutionResponse> {
    if (!this.handler) {
      throw new Error('No mock handler registered');
    }
    return this.handler(req);
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

test.describe('Phase 11.1B-C-A — Replay HTTP Dispatcher Unit Tests', () => {
  let dispatcher: ReplayHttpDispatcher;
  let mockAdapter: MockTransportAdapter;
  let mockRequest: ReplayRequestDefinition;

  test.beforeEach(() => {
    mockAdapter = new MockTransportAdapter();
    dispatcher = new ReplayHttpDispatcher(mockAdapter);
    mockRequest = {
      url: 'http://localhost:3000/api/Addresss/8',
      method: 'GET',
      headers: [{ name: 'Accept', value: 'application/json' }],
      planId: 'plan_b1',
      bundleId: 'b1',
      assemblyId: 'asm1',
      baselineExchangeId: 'ex1',
      replayCandidateId: 'cand1'
    };
  });

  test('1. Successful dispatch forwards to transport adapter and captures response', async () => {
    mockAdapter.setHandler(async (req) => {
      expect(req.url).toBe(mockRequest.url);
      expect(req.method).toBe(mockRequest.method);
      return {
        success: true,
        response: {
          statusCode: 200,
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          bodyStr: '{"ok": true}'
        },
        error: undefined,
        diagnostics: {
          observedResponseTimeMs: 15,
          clientEngine: 'mock'
        }
      };
    });

    const res = await dispatcher.dispatch(mockRequest, 5000);
    expect(res.success).toBe(true);
    expect(res.response?.statusCode).toBe(200);
    expect(res.response?.bodyStr).toBe('{"ok": true}');
    expect(res.diagnostics.observedResponseTimeMs).toBe(15);
  });

  test('2. Timeout classification maps transport errors', async () => {
    mockAdapter.setHandler(async () => {
      return {
        success: false,
        error: {
          category: 'TIMEOUT',
          message: 'Connection timed out'
        },
        diagnostics: {
          observedResponseTimeMs: 5000,
          clientEngine: 'mock'
        }
      };
    });

    const res = await dispatcher.dispatch(mockRequest, 5000);
    expect(res.success).toBe(false);
    expect(res.error?.category).toBe('TIMEOUT');
    expect(res.error?.message).toBe('Connection timed out');
  });

  test('3. Target unreachable classification maps DNS issues', async () => {
    mockAdapter.setHandler(async () => {
      return {
        success: false,
        error: {
          category: 'TARGET_UNREACHABLE',
          message: 'getaddrinfo ENOTFOUND host'
        },
        diagnostics: {
          observedResponseTimeMs: 50,
          clientEngine: 'mock'
        }
      };
    });

    const res = await dispatcher.dispatch(mockRequest, 5000);
    expect(res.success).toBe(false);
    expect(res.error?.category).toBe('TARGET_UNREACHABLE');
  });

  test('4. Connection failure classification maps socket termination', async () => {
    mockAdapter.setHandler(async () => {
      return {
        success: false,
        error: {
          category: 'CONNECTION_FAILURE',
          message: 'read ECONNRESET'
        },
        diagnostics: {
          observedResponseTimeMs: 100,
          clientEngine: 'mock'
        }
      };
    });

    const res = await dispatcher.dispatch(mockRequest, 5000);
    expect(res.success).toBe(false);
    expect(res.error?.category).toBe('CONNECTION_FAILURE');
  });

  test('5. TLS failure classification maps SSL handshake failure', async () => {
    mockAdapter.setHandler(async () => {
      return {
        success: false,
        error: {
          category: 'TLS_FAILURE',
          message: 'unable to verify the first certificate'
        },
        diagnostics: {
          observedResponseTimeMs: 80,
          clientEngine: 'mock'
        }
      };
    });

    const res = await dispatcher.dispatch(mockRequest, 5000);
    expect(res.success).toBe(false);
    expect(res.error?.category).toBe('TLS_FAILURE');
  });

  test('6. Unsupported method rejection throws safety block errors', async () => {
    const unsafeReq: ReplayRequestDefinition = {
      ...mockRequest,
      method: 'POST' as any
    };

    const res = await dispatcher.dispatch(unsafeReq, 5000);
    expect(res.success).toBe(false);
    expect(res.error?.category).toBe('UNSUPPORTED_METHOD');
  });

  test('7. Diagnostics collection tracks observed latency and engine', async () => {
    mockAdapter.setHandler(async () => {
      return {
        success: true,
        response: { statusCode: 200, headers: [] },
        diagnostics: {
          observedResponseTimeMs: 142,
          clientEngine: 'mock-playwright'
        }
      };
    });

    const res = await dispatcher.dispatch(mockRequest, 5000);
    expect(res.diagnostics.observedResponseTimeMs).toBe(142);
    expect(res.diagnostics.clientEngine).toBe('mock-playwright');
  });

  test('8. Deterministic repeated dispatch yields identical response structures', async () => {
    mockAdapter.setHandler(async () => {
      return {
        success: true,
        response: { statusCode: 200, headers: [], bodyStr: 'val' },
        diagnostics: {
          observedResponseTimeMs: 10,
          clientEngine: 'mock'
        }
      };
    });

    const res1 = await dispatcher.dispatch(mockRequest, 5000);
    const res2 = await dispatcher.dispatch(mockRequest, 5000);

    expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
    expect(Object.isFrozen(res1)).toBe(true);
    expect(Object.isFrozen(res1.diagnostics)).toBe(true);
  });

  test('9. Adapter invocation correctness verifies parameter transmission', async () => {
    let invoked = false;
    mockAdapter.setHandler(async (req) => {
      invoked = true;
      expect(req.timeoutMs).toBe(3200);
      expect(req.headers[0].name).toBe('Accept');
      return {
        success: true,
        response: { statusCode: 200, headers: [] },
        diagnostics: { observedResponseTimeMs: 5, clientEngine: 'mock' }
      };
    });

    await dispatcher.dispatch(mockRequest, 3200);
    expect(invoked).toBe(true);
  });
});

test.describe('Phase 11.1B-C-B — Replay Execution Runtime Integration Tests', () => {
  let mockResolver: MockCredentialResolver;
  let mockAdapter: MockTransportAdapter;
  let runtime: ReplayExecutionRuntime;
  let context: ReplayExecutionContext;

  test.beforeEach(() => {
    mockResolver = new MockCredentialResolver();
    mockAdapter = new MockTransportAdapter();
    runtime = new ReplayExecutionRuntime(mockAdapter);
    context = {
      targetBaseUrl: 'http://localhost:3000',
      timeoutMs: 5000,
      credentialResolver: mockResolver
    };
  });

  test('1. Successful orchestration path matches spec', async () => {
    mockResolver.register('usr_attacker', [{ name: 'Cookie', value: 'session=attacker_cookie' }]);
    mockAdapter.setHandler(async (req) => {
      return {
        success: true,
        response: {
          statusCode: 200,
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          bodyStr: '{"data": "success"}'
        },
        diagnostics: {
          observedResponseTimeMs: 15,
          clientEngine: 'mock'
        }
      };
    });

    const plan = createMockPlan();
    const result = await runtime.execute(plan, context);

    expect(result.executionStatus).toBe('SUCCESS');
    expect(result.responseReceived?.statusCode).toBe(200);
    expect(result.responseReceived?.bodyStr).toBe('{"data": "success"}');
    expect(result.diagnostics.observedResponseTimeMs).toBe(15);
    expect(result.diagnostics.clientEngine).toBe('mock');
    expect(result.failureCategory).toBeUndefined();
  });

  test('2. Request builder failure short-circuits to output and maps UNSUPPORTED_METHOD', async () => {
    mockResolver.register('usr_attacker', []);
    const plan = createMockPlan({ allowedMethod: 'POST' as any });

    const result = await runtime.execute(plan, context);

    expect(result.executionStatus).toBe('FAILED');
    expect(result.failureCategory).toBe('UNSUPPORTED_METHOD');
    expect(result.diagnostics.observedResponseTimeMs).toBe(0);
    expect(result.diagnostics.clientEngine).toBe('none');
    expect(result.responseReceived).toBeUndefined();
  });

  test('3. Credential resolution failure is caught and mapped to MISSING_CREDENTIAL_CONTEXT', async () => {
    // Registering nothing will cause auth context resolution error
    const plan = createMockPlan();
    const result = await runtime.execute(plan, context);

    expect(result.executionStatus).toBe('FAILED');
    expect(result.failureCategory).toBe('MISSING_CREDENTIAL_CONTEXT');
    expect(result.diagnostics.observedResponseTimeMs).toBe(0);
    expect(result.diagnostics.clientEngine).toBe('none');
    expect(result.responseReceived).toBeUndefined();
  });

  test('4. Dispatcher failure (timeout) propagates successfully', async () => {
    mockResolver.register('usr_attacker', []);
    mockAdapter.setHandler(async () => {
      return {
        success: false,
        error: {
          category: 'TIMEOUT',
          message: 'Connection timed out'
        },
        diagnostics: {
          observedResponseTimeMs: 5000,
          clientEngine: 'mock'
        }
      };
    });

    const plan = createMockPlan();
    const result = await runtime.execute(plan, context);

    expect(result.executionStatus).toBe('FAILED');
    expect(result.failureCategory).toBe('TIMEOUT');
    expect(result.failureMessage).toBe('Connection timed out');
    expect(result.diagnostics.observedResponseTimeMs).toBe(5000);
    expect(result.diagnostics.clientEngine).toBe('mock');
  });

  test('5. Traceability preservation guarantees lineage fields in success and failure', async () => {
    // Success path verification
    mockResolver.register('usr_attacker', []);
    mockAdapter.setHandler(async () => {
      return {
        success: true,
        response: { statusCode: 200, headers: [] },
        diagnostics: { observedResponseTimeMs: 10, clientEngine: 'mock' }
      };
    });

    const plan = createMockPlan({
      planId: 'p_trace',
      bundleId: 'b_trace',
      assemblyId: 'a_trace',
      baselineExchangeId: 'be_trace',
      replayCandidateId: 'rc_trace'
    });

    const successResult = await runtime.execute(plan, context);
    expect(successResult.planId).toBe('p_trace');
    expect(successResult.bundleId).toBe('b_trace');
    expect(successResult.assemblyId).toBe('a_trace');
    expect(successResult.baselineExchangeId).toBe('be_trace');
    expect(successResult.replayCandidateId).toBe('rc_trace');

    // Failure path verification (Credential failure)
    const emptyResolverContext = {
      targetBaseUrl: 'http://localhost:3000',
      timeoutMs: 5000,
      credentialResolver: new MockCredentialResolver()
    };
    const failResult = await runtime.execute(plan, emptyResolverContext);
    expect(failResult.planId).toBe('p_trace');
    expect(failResult.bundleId).toBe('b_trace');
    expect(failResult.assemblyId).toBe('a_trace');
    expect(failResult.baselineExchangeId).toBe('be_trace');
    expect(failResult.replayCandidateId).toBe('rc_trace');
  });

  test('6. Deterministic repeated execution yields identical results', async () => {
    mockResolver.register('usr_attacker', [{ name: 'Cookie', value: 'session=attacker_cookie' }]);
    mockAdapter.setHandler(async () => {
      return {
        success: true,
        response: {
          statusCode: 200,
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          bodyStr: '{"data": "success"}'
        },
        diagnostics: {
          observedResponseTimeMs: 15,
          clientEngine: 'mock'
        }
      };
    });

    const plan = createMockPlan();
    const res1 = await runtime.execute(plan, context);
    const res2 = await runtime.execute(plan, context);

    expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
    expect(Object.isFrozen(res1)).toBe(true);
    expect(Object.isFrozen(res1.requestSent)).toBe(true);
    expect(Object.isFrozen(res1.requestSent.headers)).toBe(true);
  });
});

