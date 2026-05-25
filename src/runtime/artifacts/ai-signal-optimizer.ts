import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';

export class AiSignalOptimizer {
  /**
   * Optimizes evidence arrays for AI consumption by stripping noisy headers
   * and truncating overly large semantic bodies, maximizing token density.
   */
  public optimizeEvidence(exchange: CanonicalHttpExchange): any {
    return {
      id: exchange.exchangeId,
      req: {
        method: exchange.request.method,
        url: exchange.request.url,
        // Only keep structurally significant headers for AI
        headers: this.filterHeaders(exchange.request.headers),
        body: this.truncateBody(exchange.request.bodyStr)
      },
      res: exchange.response ? {
        status: exchange.response.status,
        body: this.truncateBody(exchange.response.bodyStr)
      } : undefined
    };
  }

  private filterHeaders(headers: {name: string, value: string}[]): {name: string, value: string}[] {
    const keepList = new Set(['content-type', 'authorization', 'cookie', 'x-csrf-token']);
    return headers.filter(h => keepList.has(h.name.toLowerCase()));
  }

  private truncateBody(bodyStr?: string): string | undefined {
    if (!bodyStr) return undefined;
    if (bodyStr.length < 1000) return bodyStr;
    
    return bodyStr.substring(0, 1000) + '... [TRUNCATED FOR AI SIGNAL]';
  }
}
