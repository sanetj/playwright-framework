export interface ReplayExecutionContext {
  readonly targetBaseUrl: string;
  readonly timeoutMs: number;
  readonly credentialResolver: CredentialVaultResolver;
  readonly globalHeaders?: readonly { name: string; value: string }[];
}

export interface CredentialVaultResolver {
  resolveCredentials(authContextId: string): Promise<{
    readonly headers: readonly { name: string; value: string }[];
  }>;
}

export interface ReplayExecutionResult {
  readonly resultId: string;
  readonly planId: string;
  readonly bundleId: string;
  readonly assemblyId: string;
  readonly baselineExchangeId: string;
  readonly replayCandidateId: string;

  readonly executionStatus: 'SUCCESS' | 'FAILED' | 'ABORTED';
  readonly failureCategory?: 'MISSING_CREDENTIAL_CONTEXT' | 'TARGET_UNREACHABLE' | 'TIMEOUT' | 'UNSUPPORTED_METHOD' | 'EXECUTION_ERROR';
  readonly failureMessage?: string;

  readonly requestSent: {
    readonly url: string;
    readonly method: 'GET' | 'HEAD';
    readonly headers: readonly { name: string; value: string }[];
  };

  readonly responseReceived?: {
    readonly statusCode: number;
    readonly headers: readonly { name: string; value: string }[];
    readonly bodyStr?: string;
  };

  readonly diagnostics: {
    readonly observedResponseTimeMs: number;
    readonly clientEngine: string;
  };
}
