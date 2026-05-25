import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';
import { ExportProfileConfig } from './export-profile';

export class BundleRedactor {
  /**
   * Redacts evidence exchanges based on the current export profile to minimize noise.
   */
  public redactExchange(exchange: CanonicalHttpExchange, config: ExportProfileConfig): any {
    const redactedReq: any = {
      method: exchange.request.method,
      url: exchange.request.url
    };

    if (config.includeHeaders) {
      redactedReq.headers = exchange.request.headers;
    }

    if (exchange.request.bodyStr) {
      redactedReq.bodyStr = exchange.request.bodyStr.length > config.truncateBodiesOverBytes 
        ? `${exchange.request.bodyStr.substring(0, config.truncateBodiesOverBytes)}... [REDACTED]`
        : exchange.request.bodyStr;
    }

    const redactedRes: any = {
      status: exchange.response.status
    };

    if (config.includeHeaders) {
      redactedRes.headers = exchange.response.headers;
    }

    if (config.includeFullResponseBody && exchange.response.bodyStr) {
      redactedRes.bodyStr = exchange.response.bodyStr.length > config.truncateBodiesOverBytes 
        ? `${exchange.response.bodyStr.substring(0, config.truncateBodiesOverBytes)}... [REDACTED]`
        : exchange.response.bodyStr;
    } else if (!config.includeFullResponseBody) {
      redactedRes.bodyStr = '[OMITTED BY PROFILE]';
    }

    return {
      exchangeId: exchange.exchangeId.id,
      timestamp: exchange.timestamp,
      durationMs: exchange.durationMs,
      request: redactedReq,
      response: redactedRes
    };
  }
}
