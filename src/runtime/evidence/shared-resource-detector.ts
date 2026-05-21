import { OwnershipLink } from '../../intelligence/ontology/entity-lineage';

export class SharedResourceDetector {
  /**
   * Identifies if a resource is intentionally shared among multiple users
   * (e.g. public endpoints, global config, tenant-wide resources),
   * suppressing false positive IDOR alerts.
   */
  public isSharedResource(entityId: string, links: OwnershipLink[], tenantContexts: Map<string, string>): boolean {
    const observingSessions = new Set(links.map(l => l.sessionId));
    
    // If it's observed by everyone across different tenants, it's highly likely a global resource
    let uniqueTenants = 0;
    const seenTenants = new Set<string>();

    for (const session of observingSessions) {
      const tenant = tenantContexts.get(session);
      if (tenant && !seenTenants.has(tenant)) {
        seenTenants.add(tenant);
        uniqueTenants++;
      }
    }

    // Heuristic: If accessed safely across multiple distinct tenants, it's public/global
    if (uniqueTenants > 1) {
      return true;
    }

    // Heuristic: If it has generic ID forms like "default", "global", "all"
    if (['default', 'global', 'all', 'public', '0'].includes(entityId.toLowerCase())) {
      return true;
    }

    return false;
  }
}
