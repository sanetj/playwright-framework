import { SemanticEndpoint } from './semantic-api-analyzer';

export interface EntityRelationship {
  entity: string;
  relatedTo: string[];
  operations: string[];
  risk: 'low' | 'medium' | 'high';
}

export class EntityDerivation {
  public infer(endpoints: SemanticEndpoint[]): EntityRelationship[] {
    const map = new Map<string, EntityRelationship>();
    for (const ep of endpoints) {
      const cur = map.get(ep.entity) ?? { entity: ep.entity, relatedTo: [], operations: [], risk: 'low' as const };
      cur.operations.push(`${ep.crud}:${ep.endpoint}`);
      const parts = ep.endpoint.split('/').filter(Boolean);
      for (const p of parts) if (/[a-z]/i.test(p) && p !== ep.entity && !cur.relatedTo.includes(p)) cur.relatedTo.push(p);
      if (ep.privilegeMutation || ep.financial) cur.risk = 'high'; else if (ep.destructive || ep.ownershipSensitive) cur.risk = cur.risk === 'high' ? 'high' : 'medium';
      map.set(ep.entity, cur);
    }
    return [...map.values()];
  }
}
