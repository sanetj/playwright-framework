import { LineageExtractionResult } from '../../runtime/instrumentation/entity-lineage-extractor';
import { OwnershipLink, OwnershipLinkType } from '../ontology/entity-lineage';

export class EntityOwnershipRegistry {
  // Maps entity ID to its ownership links across sessions
  private ownershipMap = new Map<string, OwnershipLink[]>();
  
  public registerLineage(sessionId: string, lineage: LineageExtractionResult, evidenceEventId: string): void {
    // In a black-box context, the first session to observe an entity in a RESPONSE is considered the owner.
    // In a real system, we might distinguish between CREATOR and READER, but for IDOR detection,
    // if Session A sees an ID in its response, it 'owns' it contextually.
    
    if (lineage.entities) {
      for (const entity of lineage.entities) {
        if (entity.source === 'BODY') {
          this.addLink(entity.value, sessionId, 'OWNER', evidenceEventId);
        }
      }
    }
  }

  private addLink(entityId: string, sessionId: string, type: OwnershipLinkType, evidenceEventId: string): void {
    if (!this.ownershipMap.has(entityId)) {
      this.ownershipMap.set(entityId, []);
    }
    const links = this.ownershipMap.get(entityId)!;
    // Don't add duplicate links for the same session/type
    const exists = links.some(l => l.sessionId === sessionId && l.linkType === type);
    if (!exists) {
      links.push({
        entityId,
        sessionId,
        linkType: type,
        establishedAtTs: Date.now(),
        evidenceEventId
      });
    }
  }

  public getOwners(entityId: string): OwnershipLink[] {
    return this.ownershipMap.get(entityId) || [];
  }

  /**
   * Checks if an entity is being accessed by a session that does not own it.
   */
  public isCrossSessionAccess(entityId: string, accessingSessionId: string): boolean {
    const owners = this.getOwners(entityId);
    if (owners.length === 0) return false;
    
    // If there are owners, and NONE of them are the accessing session, it's cross-session.
    return !owners.some(o => o.sessionId === accessingSessionId);
  }
  
  public getAllEntities(): string[] {
    return Array.from(this.ownershipMap.keys());
  }
}
