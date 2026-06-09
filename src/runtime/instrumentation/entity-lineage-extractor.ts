import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';

export interface ExtractedEntity {
  entityType: string; // e.g., 'UUID', 'TenantID', 'NumericID', 'JWT_CLAIM'
  value: string;
  source: 'URL' | 'BODY' | 'HEADER' | 'JWT_CLAIM';
  key?: string; // If found in a JSON object or query param, the key it was attached to
}

export interface LineageExtractionResult {
  exchangeId: string;
  sessionId: string;
  timestamp: number;
  entities: ExtractedEntity[];
}

export class EntityLineageExtractor {
  // Regex for UUID v4
  private readonly uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
  // Regex for obvious tenant or org patterns in paths: /tenant/123/ or /org/abc/
  private readonly pathIdRegex = /\/(tenant|org|user|account|workspace|project|team)s?\/([a-zA-Z0-9_-]+)/gi;
  // Regex for JWT tokens
  private readonly jwtRegex = /ey[A-Za-z0-9_-]+\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

  public extract(exchange: CanonicalHttpExchange): LineageExtractionResult {
    const entities: ExtractedEntity[] = [];

    // 1. Extract from URL
    this.extractFromUrl(exchange.request.url, entities);

    // 2. Extract from Request Body
    if (exchange.request.bodyStr) {
      this.extractFromBody(exchange.request.bodyStr, entities);
    }

    // 3. Extract from Response Body
    if (exchange.response?.bodyStr) {
      this.extractFromBody(exchange.response.bodyStr, entities);
    }

    // 4. Extract from Headers (e.g. x-tenant-id, authorization)
    this.extractFromHeaders(exchange.request.headers, entities);
    if (exchange.response) {
      this.extractFromHeaders(exchange.response.headers, entities);
    }

    return {
      exchangeId: exchange.exchangeId.id,
      sessionId: exchange.sessionId,
      timestamp: exchange.timestamp,
      entities: this.deduplicate(entities)
    };
  }

  private extractFromUrl(url: string, results: ExtractedEntity[]): void {
    // Check UUIDs in URL
    const uuids = Array.from(url.matchAll(this.uuidRegex));
    for (const match of uuids) {
      results.push({ entityType: 'UUID', value: match[0], source: 'URL' });
    }

    // Check specific path patterns
    const pathIds = Array.from(url.matchAll(this.pathIdRegex));
    for (const match of pathIds) {
      results.push({ entityType: 'PathID', key: match[1], value: match[2], source: 'URL' });
    }
  }

  private extractFromBody(bodyStr: string, results: ExtractedEntity[]): void {
    const uuids = Array.from(bodyStr.matchAll(this.uuidRegex));
    for (const match of uuids) {
      results.push({ entityType: 'UUID', value: match[0], source: 'BODY' });
    }

    // Try parsing JSON to find specific ID fields
    try {
      const obj = JSON.parse(bodyStr);
      this.traverseJsonForIds(obj, results);
    } catch {
      // Not JSON, that's fine
    }
  }

  private traverseJsonForIds(obj: any, results: ExtractedEntity[], prefix = ''): void {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' || typeof value === 'number') {
        const keyLower = key.toLowerCase();
        if (keyLower.endsWith('id') || keyLower === 'uuid' || keyLower === 'guid') {
          results.push({
            entityType: 'FieldID',
            key: prefix ? `${prefix}.${key}` : key,
            value: String(value),
            source: 'BODY'
          });
        }
      } else if (typeof value === 'object') {
        this.traverseJsonForIds(value, results, prefix ? `${prefix}.${key}` : key);
      }
    }
  }

  private extractFromHeaders(headers: {name: string, value: string}[], results: ExtractedEntity[]): void {
    for (const header of headers) {
      const name = header.name.toLowerCase();
      const value = header.value;

      // Extract explicit identity headers
      if (name.includes('tenant') || name.includes('org') || name.includes('account') || name.includes('workspace')) {
        results.push({
          entityType: 'HeaderID',
          key: name,
          value,
          source: 'HEADER'
        });
      }

      // Check for JWT tokens anywhere in headers (Authorization or Cookies)
      const jwts = Array.from(value.matchAll(this.jwtRegex));
      for (const match of jwts) {
        this.extractFromJwt(match[0], results);
      }
    }
  }

  private extractFromJwt(token: string, results: ExtractedEntity[]): void {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return;

      const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);

      const identityKeys = ['sub', 'tenant', 'tenant_id', 'tenantid', 'org', 'org_id', 'orgid', 'workspace', 'workspace_id', 'account', 'account_id', 'role', 'roles'];

      for (const key of Object.keys(payload)) {
        if (identityKeys.includes(key.toLowerCase())) {
          let val = payload[key];
          if (Array.isArray(val)) {
            val = val.join(',');
          }
          results.push({
            entityType: 'JWT_CLAIM',
            key,
            value: String(val),
            source: 'JWT_CLAIM'
          });
        }
      }
    } catch {
      // Invalid JWT or unparseable payload, fail silently
    }
  }

  private deduplicate(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Set<string>();
    return entities.filter(e => {
      const key = `${e.entityType}:${e.key || ''}:${e.value}:${e.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

