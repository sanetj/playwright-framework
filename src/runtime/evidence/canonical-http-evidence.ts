export interface HttpHeader {
  name: string;
  value: string;
}

export interface CanonicalHttpRequest {
  method: string;
  url: string;
  headers: HttpHeader[];
  bodyStr?: string;
}

export interface CanonicalHttpResponse {
  status: number;
  headers: HttpHeader[];
  bodyStr?: string;
}

export interface CanonicalHttpExchange {
  exchangeId: string;
  sessionId: string;
  timestamp: number;
  request: CanonicalHttpRequest;
  response?: CanonicalHttpResponse;
  durationMs?: number;
  error?: string;
  
  // Future proofing for other sources (HAR, proxy, etc.)
  source: 'playwright' | 'har' | 'proxy' | 'cdp';
}

export class CanonicalEvidenceFactory {
  public static createExchangeId(url: string, method: string, timestamp: number): string {
    // Generate a reasonably unique ID without heavy hashing logic if possible,
    // though a SHA-1 could be used here to match NormalizedEventBus later.
    return `exch_${timestamp}_${method}_${this.safePath(url)}`;
  }

  private static safePath(urlStr: string): string {
    try {
      return new URL(urlStr).pathname.replace(/\//g, '_');
    } catch {
      return 'unknown_path';
    }
  }
}
