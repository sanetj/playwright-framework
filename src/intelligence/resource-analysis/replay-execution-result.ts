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
  readonly failureCategory?: 'MISSING_CREDENTIAL_CONTEXT' | 'TARGET_UNREACHABLE' | 'TIMEOUT' | 'UNSUPPORTED_METHOD' | 'EXECUTION_ERROR' | 'MALFORMED_RESPONSE' | 'UNKNOWN_FAILURE' | 'CONNECTION_FAILURE' | 'TLS_FAILURE';
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

export interface RawReplayExecutionResponse {
  readonly success: boolean;

  readonly response?: {
    readonly statusCode: number;
    readonly headers: readonly { name: string; value: string }[];
    readonly bodyStr?: string;
  };

  readonly error?: {
    readonly category: 'MISSING_CREDENTIAL_CONTEXT' | 'TARGET_UNREACHABLE' | 'TIMEOUT' | 'UNSUPPORTED_METHOD' | 'EXECUTION_ERROR' | 'CONNECTION_FAILURE' | 'TLS_FAILURE' | 'MALFORMED_RESPONSE' | 'UNKNOWN_FAILURE';
    readonly message: string;
  };

  readonly diagnostics: {
    readonly observedResponseTimeMs: number;
    readonly clientEngine: string;
  };
}

export interface HttpTransportAdapter {
  sendRequest(
    request: {
      readonly url: string;
      readonly method: 'GET' | 'HEAD';
      readonly headers: readonly { name: string; value: string }[];
      readonly timeoutMs: number;
    }
  ): Promise<RawReplayExecutionResponse>;
}
