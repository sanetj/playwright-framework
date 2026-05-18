import { ApiEndpoint } from '../../models/schema';

export type CrudSemantic = 'create' | 'read' | 'update' | 'delete' | 'action';

export interface SemanticApiModel {
  endpointId: string;
  entity: string;
  semantic: CrudSemantic;
  ownershipScope: 'global' | 'tenant' | 'user' | 'unknown';
  privilegeSensitive: boolean;
  destructive: boolean;
  financial: boolean;
  authRequiredLikely: boolean;
  reason: string[];
}

export class SemanticApiAnalyzer {
  public analyze(endpoints: ApiEndpoint[]): SemanticApiModel[] {
    return endpoints.map((endpoint) => this.classifyEndpoint(endpoint));
  }

  private classifyEndpoint(endpoint: ApiEndpoint): SemanticApiModel {
    const path = this.extractPath(endpoint.url);
    const tokens = path.split('/').filter(Boolean);
    const method = endpoint.method;
    const entity = tokens.find((t) => !/^v\d+$/i.test(t) && !/^\d+$/.test(t)) ?? 'unknown';

    const semantic: CrudSemantic =
      method === 'POST' ? 'create' : method === 'GET' ? 'read' : method === 'PATCH' || method === 'PUT' ? 'update' : method === 'DELETE' ? 'delete' : 'action';

    const reason: string[] = [];
    const destructive = semantic === 'delete' || /(delete|remove|purge|revoke|cancel)/i.test(path);
    if (destructive) reason.push('destructive operation semantics detected');

    const privilegeSensitive = /(role|permission|admin|privilege|policy|invite)/i.test(path);
    if (privilegeSensitive) reason.push('privilege mutation or admin surface indicator');

    const financial = /(wallet|invoice|payment|transfer|payout|refund|billing)/i.test(path);
    if (financial) reason.push('financial workflow indicator');

    const ownershipScope: SemanticApiModel['ownershipScope'] =
      /\/users?\/\d+/.test(path) ? 'user' : /\/org|tenant|workspace/.test(path) ? 'tenant' : /\/admin/.test(path) ? 'global' : 'unknown';

    const authRequiredLikely = privilegeSensitive || financial || ['create', 'update', 'delete'].includes(semantic);

    return {
      endpointId: endpoint.id,
      entity,
      semantic,
      ownershipScope,
      privilegeSensitive,
      destructive,
      financial,
      authRequiredLikely,
      reason,
    };
  }

  private extractPath(url: string): string {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }
}
