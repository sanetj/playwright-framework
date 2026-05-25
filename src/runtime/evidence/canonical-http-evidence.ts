export interface HttpHeader {
  name: string;
  value: string;
}

import { RuntimeExchangeId } from './runtime-exchange-id';

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
  exchangeId: RuntimeExchangeId;
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
  // Empty, keeping it around if needed for other factories.
}
