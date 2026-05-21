/**
 * @canonical
 * Primitives for tracking data entity lineage and object ownership flow.
 */

export interface DataEntity {
  id: string;
  type: string;
  sourceEventId: string;
  creatorSessionId?: string;
  extractedValue: unknown;
}

export type OwnershipLinkType = 'CREATOR' | 'OWNER' | 'READER' | 'MUTATOR';

export interface OwnershipLink {
  entityId: string;
  sessionId: string;
  linkType: OwnershipLinkType;
  establishedAtTs: number;
  evidenceEventId: string;
}

export interface EntityObservation {
  id: string;
  entityId: string;
  observedInEventId: string;
  ts: number;
  context: 'RESPONSE_BODY' | 'REQUEST_URL' | 'REQUEST_BODY' | 'DOM_TEXT' | 'STORAGE';
}

export interface EntityFlowEdge {
  fromEventId: string;
  toEventId: string;
  entityId: string;
  confidence: number;
}

export interface EntityAccessEvent {
  id: string;
  entityId: string;
  actorSessionId: string;
  ts: number;
  accessType: 'READ' | 'WRITE' | 'DELETE';
  isCrossTenant: boolean;
  evidenceEventId: string;
}
