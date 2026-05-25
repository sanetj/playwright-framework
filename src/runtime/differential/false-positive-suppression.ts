import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';

export class FalsePositiveSuppressor {
  /**
   * Evaluates an exchange to determine if it should be suppressed from findings
   * because it's a known noisy artifact (e.g., caches, analytics, public assets).
   */
  public shouldSuppress(exchange: CanonicalHttpExchange): boolean {
    const urlLower = exchange.request.url.toLowerCase();

    // 1. Known Public Object / Static Asset Suppression
    if (this.isStaticAsset(urlLower)) {
      return true;
    }

    // 2. Cache / Transient Response Suppression
    if (this.isCacheOrTransient(exchange)) {
      return true;
    }

    // 3. Analytics / Telemetry Suppression
    if (this.isTelemetry(urlLower)) {
      return true;
    }

    return false;
  }

  private isStaticAsset(url: string): boolean {
    const staticExts = ['.png', '.jpg', '.jpeg', '.gif', '.css', '.js', '.svg', '.ico', '.woff', '.woff2'];
    return staticExts.some(ext => url.endsWith(ext) || url.includes(`${ext}?`));
  }

  private isCacheOrTransient(exchange: CanonicalHttpExchange): boolean {
    // 304 Not Modified is inherently transient state
    if (exchange.response?.status === 304) return true;
    return false;
  }

  private isTelemetry(url: string): boolean {
    const telemetryKeywords = ['/telemetry', '/metrics', '/analytics', '/track', '/beacon'];
    return telemetryKeywords.some(kw => url.includes(kw));
  }
}
