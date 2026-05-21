import { CanonicalHttpRequest } from './canonical-http-evidence';
import * as crypto from 'crypto';

export class RequestFingerprinter {
  /**
   * Generates a deterministic hash for a request, ignoring dynamic headers (e.g. auth, date).
   */
  public generateFingerprint(request: CanonicalHttpRequest): string {
    const canonicalHeaders = this.getCanonicalHeaders(request.headers);
    const bodyHash = request.bodyStr ? this.hashString(request.bodyStr) : 'empty';
    
    const payload = `${request.method}:${request.url}:${canonicalHeaders}:${bodyHash}`;
    return this.hashString(payload);
  }

  private getCanonicalHeaders(headers: {name: string, value: string}[]): string {
    const ignoredHeaders = new Set(['authorization', 'cookie', 'date', 'x-request-id', 'user-agent']);
    
    return headers
      .filter(h => !ignoredHeaders.has(h.name.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(h => `${h.name.toLowerCase()}=${h.value}`)
      .join('&');
  }

  private hashString(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
