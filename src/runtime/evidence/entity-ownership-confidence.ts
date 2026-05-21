import { OwnershipLink } from '../../intelligence/ontology/entity-lineage';

export class EntityOwnershipConfidence {
  /**
   * Calculates a confidence score (0.0 to 1.0) that a session actually "owns" an entity.
   * "First observer" is a low-confidence heuristic. Stronger signals involve explicit
   * CREATE actions or continuous exclusive access.
   */
  public calculateConfidence(entityId: string, links: OwnershipLink[]): number {
    if (links.length === 0) return 0.0;

    let confidence = 0.3; // Base confidence for being observed

    const hasCreateLink = links.some(l => l.linkType === 'CREATOR');
    if (hasCreateLink) {
      confidence += 0.5; // Strongest signal
    }

    const sessions = new Set(links.map(l => l.sessionId));
    if (sessions.size === 1) {
      // Exclusive access increases confidence
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }
}
