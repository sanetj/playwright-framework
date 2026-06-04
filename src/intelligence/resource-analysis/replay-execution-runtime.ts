import { ReplayExecutionPlan } from './replay-execution-plan';
import { ReplayExecutionContext, ReplayExecutionResult, RawReplayExecutionResponse, HttpTransportAdapter } from './replay-execution-result';

export interface ReplayRequestDefinition {
  readonly url: string;
  readonly method: 'GET' | 'HEAD';
  readonly headers: readonly { name: string; value: string }[];
  readonly planId: string;
  readonly bundleId: string;
  readonly assemblyId: string;
  readonly baselineExchangeId: string;
  readonly replayCandidateId: string;
}

export class ReplayRequestBuilder {
  /**
   * Statelessly builds a concrete request definition from a plan and execution context.
   * Resolves credentials dynamically from the vault resolver.
   */
  public async buildRequest(
    plan: ReplayExecutionPlan,
    context: ReplayExecutionContext
  ): Promise<ReplayRequestDefinition> {
    // 1. Invariant Check: Target base URL must exist
    if (!context.targetBaseUrl) {
      throw new Error(`MISSING_TARGET_BASE_URL: Target base URL is missing in the execution context.`);
    }

    const baseUrl = context.targetBaseUrl.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      throw new Error(`INVALID_TARGET_BASE_URL: Target base URL must start with http:// or https://.`);
    }

    // 2. Invariant Check: GET and HEAD only
    const allowedMethod = plan.allowedMethod.toUpperCase();
    if (allowedMethod !== 'GET' && allowedMethod !== 'HEAD') {
      throw new Error(`UNSUPPORTED_METHOD: Allowed method ${allowedMethod} is not supported (GET and HEAD only).`);
    }

    const templateMethod = plan.requestTemplate.method.toUpperCase();
    if (templateMethod !== 'GET' && templateMethod !== 'HEAD') {
      throw new Error(`UNSUPPORTED_METHOD: Request template method ${templateMethod} is not supported (GET and HEAD only).`);
    }

    // 3. Invariant Check: authContextId must resolve
    const authContextId = plan.subjectAuthContext;
    if (!authContextId) {
      throw new Error(`MISSING_AUTH_CONTEXT_ID: Plan does not specify subjectAuthContext.`);
    }

    const resolved = await context.credentialResolver.resolveCredentials(authContextId);
    if (!resolved || !resolved.headers) {
      throw new Error(`UNRESOLVED_AUTH_CONTEXT: Failed to resolve credentials for authContextId "${authContextId}".`);
    }

    // 4. Construct concrete URL
    const concretePath = plan.requestTemplate.concretePath;
    const url = `${baseUrl.replace(/\/+$/, '')}/${concretePath.replace(/^\/+/, '')}`;

    // 5. Merge headers deterministically
    const headerMap = new Map<string, string>();
    const originalNames = new Map<string, string>();

    // Add plan template headers
    for (const h of plan.requestTemplate.headers) {
      const keyLower = h.name.toLowerCase();
      headerMap.set(keyLower, h.value);
      originalNames.set(keyLower, h.name);
    }

    // Add resolved credentials (override plan headers)
    for (const h of resolved.headers) {
      const keyLower = h.name.toLowerCase();
      headerMap.set(keyLower, h.value);
      originalNames.set(keyLower, h.name);
    }

    // Add global headers (override preceding headers)
    if (context.globalHeaders) {
      for (const h of context.globalHeaders) {
        const keyLower = h.name.toLowerCase();
        headerMap.set(keyLower, h.value);
        originalNames.set(keyLower, h.name);
      }
    }

    const mergedHeaders: { name: string; value: string }[] = [];
    for (const [keyLower, value] of headerMap.entries()) {
      const originalName = originalNames.get(keyLower) || keyLower;
      mergedHeaders.push({ name: originalName, value });
    }

    // Sort headers deterministically by name to ensure stable serialized output
    mergedHeaders.sort((a, b) => a.name.localeCompare(b.name));

    // 6. Traceability preservation: return unchanged traceability IDs
    return Object.freeze({
      url,
      method: allowedMethod as 'GET' | 'HEAD',
      headers: Object.freeze(mergedHeaders),
      planId: plan.planId,
      bundleId: plan.bundleId,
      assemblyId: plan.assemblyId,
      baselineExchangeId: plan.baselineExchangeId,
      replayCandidateId: plan.replayCandidateId
    });
  }
}

/**
 * Case-insensitively processes headers to redact cookies, authorization headers,
 * tokens, keys, passwords, and sessions based on fixed deterministic rules.
 */
function redactHeaders(
  headers: readonly { name: string; value: string }[]
): readonly { name: string; value: string }[] {
  const sensitiveKeys = new Set(['authorization', 'cookie', 'set-cookie', 'proxy-authorization']);
  const sensitiveSubstrings = ['token', 'secret', 'key', 'password', 'session', 'cookie', 'auth'];
  const sensitivePrefixes = ['x-api-', 'x-auth-'];

  const processed = headers.map(h => {
    const nameLower = h.name.toLowerCase();

    // 1. Exact key checks
    let isSensitive = sensitiveKeys.has(nameLower);

    // 2. Prefix checks
    if (!isSensitive) {
      isSensitive = sensitivePrefixes.some(pref => nameLower.startsWith(pref));
    }

    // 3. Substring checks
    if (!isSensitive) {
      isSensitive = sensitiveSubstrings.some(sub => nameLower.includes(sub));
    }

    return {
      name: h.name,
      value: isSensitive ? '[REDACTED]' : h.value
    };
  });

  // Sort alphabetically to maintain absolute output determinism
  return Object.freeze(processed.sort((a, b) => a.name.localeCompare(b.name)));
}

export class ReplayResultSerializer {
  /**
   * Statelessly compiles HTTP request and response values into a safe,
   * secrets-redacted, and traceable ReplayExecutionResult structure.
   */
  public serializeResult(
    request: ReplayRequestDefinition,
    status: 'SUCCESS' | 'FAILED' | 'ABORTED',
    response?: {
      readonly statusCode: number;
      readonly headers: readonly { name: string; value: string }[];
      readonly bodyStr?: string;
    },
    error?: {
      readonly category: 'MISSING_CREDENTIAL_CONTEXT' | 'TARGET_UNREACHABLE' | 'TIMEOUT' | 'UNSUPPORTED_METHOD' | 'EXECUTION_ERROR' | 'MALFORMED_RESPONSE' | 'UNKNOWN_FAILURE' | 'CONNECTION_FAILURE' | 'TLS_FAILURE';
      readonly message: string;
    },
    diagnostics?: {
      readonly observedResponseTimeMs: number;
      readonly clientEngine: string;
    }
  ): ReplayExecutionResult {
    const resultId = `result_${request.planId}`;

    const requestSent = {
      url: request.url,
      method: request.method,
      headers: redactHeaders(request.headers)
    };

    let responseReceived: {
      readonly statusCode: number;
      readonly headers: readonly { name: string; value: string }[];
      readonly bodyStr?: string;
    } | undefined = undefined;

    if (response) {
      responseReceived = {
        statusCode: response.statusCode,
        headers: redactHeaders(response.headers),
        bodyStr: response.bodyStr
      };
    }

    const diag = {
      observedResponseTimeMs: diagnostics?.observedResponseTimeMs ?? 0,
      clientEngine: diagnostics?.clientEngine ?? 'unknown'
    };

    const result: ReplayExecutionResult = {
      resultId,
      planId: request.planId,
      bundleId: request.bundleId,
      assemblyId: request.assemblyId,
      baselineExchangeId: request.baselineExchangeId,
      replayCandidateId: request.replayCandidateId,
      executionStatus: status,
      requestSent: Object.freeze(requestSent),
      diagnostics: Object.freeze(diag)
    };

    if (responseReceived) {
      (result as any).responseReceived = Object.freeze(responseReceived);
    }

    if (error) {
      (result as any).failureCategory = error.category;
      (result as any).failureMessage = error.message;
    }

    return Object.freeze(result);
  }
}

export class ReplayHttpDispatcher {
  private readonly adapter: HttpTransportAdapter;

  constructor(adapter: HttpTransportAdapter) {
    this.adapter = adapter;
  }

  /**
   * Safely dispatches a request definition using the abstract transport adapter.
   * Restricts outgoing methods strictly to GET and HEAD.
   */
  public async dispatch(
    request: ReplayRequestDefinition,
    timeoutMs: number
  ): Promise<RawReplayExecutionResponse> {
    // Safety check: verify HTTP method at execution time
    const method = request.method.toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          category: 'UNSUPPORTED_METHOD' as const,
          message: `UNSUPPORTED_METHOD: HTTP method ${method} is not permitted by dispatcher safety configuration (GET/HEAD only).`
        }),
        diagnostics: Object.freeze({
          observedResponseTimeMs: 0,
          clientEngine: 'dispatcher'
        })
      });
    }

    const start = Date.now();
    try {
      const rawRes = await this.adapter.sendRequest({
        url: request.url,
        method: method as 'GET' | 'HEAD',
        headers: request.headers,
        timeoutMs
      });
      const duration = Date.now() - start;

      const finalTiming = rawRes.diagnostics.observedResponseTimeMs > 0
        ? rawRes.diagnostics.observedResponseTimeMs
        : duration;

      return Object.freeze({
        success: rawRes.success,
        response: rawRes.response ? Object.freeze(rawRes.response) : undefined,
        error: rawRes.error ? Object.freeze(rawRes.error) : undefined,
        diagnostics: Object.freeze({
          observedResponseTimeMs: finalTiming,
          clientEngine: rawRes.diagnostics.clientEngine
        })
      });
    } catch (e: any) {
      const duration = Date.now() - start;
      return Object.freeze({
        success: false,
        error: Object.freeze({
          category: 'EXECUTION_ERROR' as const,
          message: e.message || 'Unknown network transport failure'
        }),
        diagnostics: Object.freeze({
          observedResponseTimeMs: duration,
          clientEngine: 'unknown'
        })
      });
    }
  }
}
