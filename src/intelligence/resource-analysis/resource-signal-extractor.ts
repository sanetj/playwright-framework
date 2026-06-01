import { CanonicalHttpExchange } from '../../runtime/evidence/canonical-http-evidence';
import {
  ResourceSignal,
  ResourceSignalInventory,
  ResourceTypeSignal,
  InvestigationSignalType
} from './resource-signal';

export class ResourceSignalExtractor {
  /**
   * Passive, offline extraction mapping a sequence of baseline CanonicalHttpExchanges
   * into a stable, deterministic ResourceSignalInventory.
   */
  public extractInventory(exchanges: CanonicalHttpExchange[]): ResourceSignalInventory {
    const signalMap = new Map<string, {
      resourceFamily: string;
      httpMethod: string;
      authorizationSurface: string;
      parameterKeys: Set<string>;
      exchangeIds: Set<string>;
      sessionIds: Set<string>;
      hasDownloadHeader: boolean;
      hasAttachmentToken: boolean;
    }>();

    for (const ex of exchanges) {
      const method = ex.request.method.toUpperCase();
      const { family, surface } = this.normalizeUrlToFamily(ex.request.url);
      const signature = `${method}::${family}`;

      // Extract parameter keys from request query params and body safely
      const parameterKeys = new Set<string>();
      this.extractParameters(ex.request.url, ex.request.bodyStr, parameterKeys);

      // Analyze response headers for download capabilities
      let hasDownloadHeader = false;
      let hasAttachmentToken = false;
      if (ex.response && ex.response.headers) {
        for (const h of ex.response.headers) {
          const name = h.name.toLowerCase();
          const val = h.value.toLowerCase();
          if (name === 'content-disposition') {
            hasDownloadHeader = true;
            if (val.includes('attachment')) {
              hasAttachmentToken = true;
            }
          }
        }
      }

      const existing = signalMap.get(signature);
      if (existing) {
        existing.exchangeIds.add(ex.exchangeId.id);
        existing.sessionIds.add(ex.sessionId);
        for (const key of parameterKeys) {
          existing.parameterKeys.add(key);
        }
        if (hasDownloadHeader) existing.hasDownloadHeader = true;
        if (hasAttachmentToken) existing.hasAttachmentToken = true;
      } else {
        signalMap.set(signature, {
          resourceFamily: family,
          httpMethod: method,
          authorizationSurface: surface,
          parameterKeys,
          exchangeIds: new Set<string>([ex.exchangeId.id]),
          sessionIds: new Set<string>([ex.sessionId]),
          hasDownloadHeader,
          hasAttachmentToken
        });
      }
    }

    const signals: ResourceSignal[] = [];

    for (const [signature, data] of signalMap.entries()) {
      const parameterSignature = Array.from(data.parameterKeys).sort();
      const evidenceExchangeIds = Array.from(data.exchangeIds).sort();
      const method = data.httpMethod as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

      const primaryType = this.detectResourceType(data.resourceFamily, parameterSignature);
      const investigationSignals = this.detectInvestigationSignals(
        data.resourceFamily,
        method,
        parameterSignature,
        Array.from(data.sessionIds),
        data.hasDownloadHeader || data.hasAttachmentToken
      );

      signals.push({
        resourceFamily: data.resourceFamily,
        resourceSignature: signature,
        httpMethod: method,
        primaryType,
        investigationSignals,
        authorizationSurface: data.authorizationSurface,
        parameterSignature,
        evidenceExchangeIds
      });
    }

    // Sort flat signals array alphabetically by resourceSignature to guarantee determinism
    signals.sort((a, b) => a.resourceSignature.localeCompare(b.resourceSignature));

    // Group signals by logical surface
    const signalsBySurface: Record<string, ResourceSignal[]> = {};
    for (const sig of signals) {
      if (!signalsBySurface[sig.authorizationSurface]) {
        signalsBySurface[sig.authorizationSurface] = [];
      }
      signalsBySurface[sig.authorizationSurface].push(sig);
    }

    // Sort grouped lists to maintain stable ordering
    for (const surfaceName of Object.keys(signalsBySurface)) {
      signalsBySurface[surfaceName].sort((a, b) => a.resourceSignature.localeCompare(b.resourceSignature));
    }

    return {
      exportVersion: '1.0.0',
      signals,
      signalsBySurface
    };
  }

  /**
   * Parameterize dynamic numeric and UUID route segments to extract resource families.
   */
  public normalizeUrlToFamily(urlStr: string): { family: string; surface: string } {
    let urlPath = urlStr;
    try {
      if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
        const parsed = new URL(urlStr);
        urlPath = parsed.pathname;
      }
    } catch {
      // Fallback to directly cleaning path
    }

    let family = urlPath;

    // Parameterize UUID standard segments first to prevent dynamic numeric prefixes from being sliced
    const uuidRegex = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    family = family.replace(uuidRegex, '/:uuid');

    // 1. Parameterize known structural entities
    if (/\/rest\/basket\/(\d+)/i.test(family)) {
      family = family.replace(/\/rest\/basket\/(\d+)/i, '/rest/basket/:basketId');
    } else if (/\/api\/invoice\/(\d+)/i.test(family)) {
      family = family.replace(/\/api\/invoice\/(\d+)/i, '/api/invoice/:invoiceId');
    } else if (/\/rest\/user\/(\d+)/i.test(family)) {
      family = family.replace(/\/rest\/user\/(\d+)/i, '/rest/user/:userId');
    } else {
      // Generic numbers replacement
      family = family.replace(/\/(\d+)/g, '/:id');
    }

    // 2. Synthesize stable human-readable Authorization Surface names
    let surface = 'General Surface';
    const segments = family.split('/').filter(s => s.length > 0);
    if (segments.length > 0) {
      const first = segments[0].toLowerCase();
      const second = segments.length > 1 ? segments[1].toLowerCase() : '';

      if (first === 'rest' && second === 'basket') {
        surface = 'Basket Surface';
      } else if (first === 'api' && second === 'invoice') {
        surface = 'Invoice Surface';
      } else if (first === 'rest' && second === 'user') {
        surface = 'User Surface';
      } else if (first === 'api' && second === 'administration') {
        surface = 'Administration Surface';
      } else if (first === 'billing' || second === 'billing') {
        surface = 'Billing Surface';
      } else if (first === 'export' || second === 'export') {
        surface = 'Export Surface';
      } else if (first === 'reports' || second === 'reports' || second === 'report') {
        surface = 'Report Surface';
      } else {
        const target = (first === 'rest' || first === 'api') && second ? second : first;
        surface = target.charAt(0).toUpperCase() + target.slice(1) + ' Surface';
      }
    }

    return { family, surface };
  }

  /**
   * Detect resource classification nature.
   */
  private detectResourceType(family: string, params: string[]): ResourceTypeSignal {
    const pathLower = family.toLowerCase();
    const joinedParams = params.join(',').toLowerCase();

    const isBilling = pathLower.includes('billing') || pathLower.includes('invoice') || pathLower.includes('payment') || joinedParams.includes('invoice') || joinedParams.includes('payment');
    if (isBilling) return 'BILLING';

    const isUser = pathLower.includes('user') || pathLower.includes('profile') || pathLower.includes('basket') || pathLower.includes('cart') || joinedParams.includes('user') || joinedParams.includes('basket');
    if (isUser) return 'USER';

    const isTenant = pathLower.includes('tenant') || pathLower.includes('org') || pathLower.includes('company') || joinedParams.includes('tenant');
    if (isTenant) return 'TENANT';

    const isWorkspace = pathLower.includes('workspace') || pathLower.includes('project') || pathLower.includes('folder') || joinedParams.includes('workspace');
    if (isWorkspace) return 'WORKSPACE';

    const isExport = pathLower.includes('export') || pathLower.includes('backup') || joinedParams.includes('export');
    if (isExport) return 'EXPORT';

    const isReport = pathLower.includes('report') || pathLower.includes('stat') || pathLower.includes('analytic') || joinedParams.includes('report');
    if (isReport) return 'REPORT';

    return 'DOCUMENT'; // Default fallback structure
  }

  /**
   * Detect specific investigation-centric indicators.
   */
  private detectInvestigationSignals(
    family: string,
    method: string,
    params: string[],
    sessionIds: string[],
    hasDownloadHeader: boolean
  ): InvestigationSignalType[] {
    const signals = new Set<InvestigationSignalType>();
    const pathLower = family.toLowerCase();
    const joinedParams = params.join(',').toLowerCase();

    // 1. OBJECT_IDENTIFIER_PRESENT
    const hasPathId = family.includes(':id') || family.includes(':basketId') || family.includes(':invoiceId') || family.includes(':userId') || family.includes(':uuid');
    const hasQueryId = params.includes('id') || params.includes('basketId') || params.includes('invoiceId') || params.includes('userId') || params.includes('uuid');
    if (hasPathId || hasQueryId) {
      signals.add('OBJECT_IDENTIFIER_PRESENT');
    }

    // 2. CROSS_ROLE_VISIBLE
    if (sessionIds.length > 1) {
      signals.add('CROSS_ROLE_VISIBLE');
    }

    // 3. TENANT_SCOPED
    if (pathLower.includes('tenant') || joinedParams.includes('tenant') || joinedParams.includes('tenantid')) {
      signals.add('TENANT_SCOPED');
    }

    // 4. USER_SCOPED
    if (pathLower.includes('user') || pathLower.includes('profile') || joinedParams.includes('user') || joinedParams.includes('userid')) {
      signals.add('USER_SCOPED');
    }

    // 5. BOUNDARY_ADJACENT
    if (pathLower.includes('admin') || pathLower.includes('administration') || pathLower.includes('restricted')) {
      signals.add('BOUNDARY_ADJACENT');
    }

    // 6. EXPORT_CAPABLE
    if (pathLower.includes('export') || pathLower.includes('backup') || joinedParams.includes('export')) {
      signals.add('EXPORT_CAPABLE');
    }

    // 7. DOWNLOAD_CAPABLE
    if (hasDownloadHeader || pathLower.includes('download') || pathLower.includes('file') || pathLower.includes('attachment')) {
      signals.add('DOWNLOAD_CAPABLE');
    }

    // 8. PRIVILEGE_TRANSITION_OBSERVED
    if (pathLower.includes('login') || pathLower.includes('token') || pathLower.includes('oauth') || pathLower.includes('session')) {
      signals.add('PRIVILEGE_TRANSITION_OBSERVED');
    }

    return Array.from(signals).sort();
  }

  /**
   * Passive extraction of parameter keys from URL queries and body payloads.
   */
  private extractParameters(urlStr: string, bodyStr: string | undefined, keys: Set<string>): void {
    try {
      if (urlStr.includes('?')) {
        const queryStr = urlStr.split('?')[1];
        const params = new URLSearchParams(queryStr);
        for (const [key] of params.entries()) {
          keys.add(key);
        }
      }
    } catch {
      // Ignored
    }

    if (bodyStr) {
      try {
        const parsed = JSON.parse(bodyStr);
        if (parsed && typeof parsed === 'object') {
          for (const key of Object.keys(parsed)) {
            keys.add(key);
          }
        }
      } catch {
        // Ignored if body is not JSON
      }
    }
  }
}
