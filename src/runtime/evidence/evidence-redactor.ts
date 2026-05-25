import { CanonicalHttpExchange } from './canonical-http-evidence';

export interface InternalEvidenceBundle {
  exchanges: CanonicalHttpExchange[];
  sessionIdentifiers: string[];
}

export interface ExportEvidenceBundle {
  redactedExchanges: CanonicalHttpExchange[];
}

export class EvidenceRedactor {
  /**
   * Transitions internal evidence into a safe export bundle by explicitly stripping
   * Authorization headers, Cookies, and sensitive known session identifiers.
   * This prevents accidental leakage when the bundle is uploaded to an LLM or bug bounty platform.
   */
  public redact(internal: InternalEvidenceBundle): ExportEvidenceBundle {
    const redactedExchanges = internal.exchanges.map(ex => this.redactExchange(ex, internal.sessionIdentifiers));
    
    return {
      redactedExchanges
    };
  }

  private redactExchange(ex: CanonicalHttpExchange, sensitiveTokens: string[]): CanonicalHttpExchange {
    // Deep clone to avoid mutating the internal cache
    const clone = JSON.parse(JSON.stringify(ex)) as CanonicalHttpExchange;
    
    // 1. Redact Headers
    if (clone.request.headers) {
      this.scrubHeaders(clone.request.headers);
    }
    if (clone.response?.headers) {
      this.scrubHeaders(clone.response.headers);
    }

    // 2. Scrub specific known tokens from bodies
    if (clone.request.postData && sensitiveTokens.length > 0) {
      clone.request.postData = this.scrubText(clone.request.postData, sensitiveTokens);
    }
    if (clone.response?.text && sensitiveTokens.length > 0) {
      clone.response.text = this.scrubText(clone.response.text, sensitiveTokens);
    }

    return clone;
  }

  private scrubHeaders(headers: Record<string, string>) {
    const keys = Object.keys(headers);
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (lower === 'authorization') {
        headers[key] = 'Bearer [REDACTED]';
      } else if (lower === 'cookie') {
        headers[key] = '[REDACTED]';
      } else if (lower === 'set-cookie') {
        headers[key] = '[REDACTED]';
      }
    }
  }

  private scrubText(text: string, tokens: string[]): string {
    let result = text;
    for (const token of tokens) {
      // Basic replacement. In a real system, would use more robust token boundaries.
      if (token && token.length > 4) { // Don't replace tiny strings
        result = result.split(token).join('[REDACTED]');
      }
    }
    return result;
  }
}
