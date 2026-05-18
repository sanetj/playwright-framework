import { NormalizedEvent } from '../events/normalized-event';

export interface SemanticEndpoint {
  endpoint: string;
  entity: string;
  crud: 'create' | 'read' | 'update' | 'delete' | 'action';
  ownershipSensitive: boolean;
  financial: boolean;
  destructive: boolean;
  privilegeMutation: boolean;
  mutation: boolean;
}

export class SemanticApiAnalyzer {
  analyze(events: NormalizedEvent[]): SemanticEndpoint[] {
    const seen = new Map<string, SemanticEndpoint>();
    for (const e of events.filter((x) => x.type === 'api_request')) {
      const p = e.payload as Record<string, unknown>;
      const method = String(p.method ?? 'GET').toUpperCase();
      const url = String(p.url ?? '');
      const path = this.path(url);
      const endpoint = `${method} ${path}`;
      const entity = path.split('/').filter(Boolean).find((x) => !/^v\d+$/i.test(x) && !/^\d+$/.test(x)) ?? 'unknown';
      const crud = method === 'POST' ? 'create' : method === 'GET' ? 'read' : method === 'PATCH' || method === 'PUT' ? 'update' : method === 'DELETE' ? 'delete' : 'action';
      seen.set(endpoint, {
        endpoint,
        entity,
        crud,
        ownershipSensitive: /\/users?\/\d+|\/accounts?\/\d+|\/projects?\/\d+/.test(path),
        financial: /(wallet|payment|invoice|billing|transfer|refund|payout)/i.test(path),
        destructive: crud === 'delete' || /(cancel|revoke|remove|purge)/i.test(path),
        privilegeMutation: /(role|permission|policy|admin)/i.test(path),
        mutation: ['create', 'update', 'delete', 'action'].includes(crud),
      });
    }
    return [...seen.values()];
  }

  private path(url: string): string { try { return new URL(url).pathname.toLowerCase(); } catch { return url.toLowerCase(); } }
}
