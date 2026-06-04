import { ReplayExecutionPlan } from './replay-execution-plan';
import { ReplayExecutionContext } from './replay-execution-result';

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
