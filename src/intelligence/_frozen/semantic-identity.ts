/**
 * @canonical
 * Foundational primitives for tracking semantic identity continuity.
 * Identity is an immutable event lineage, not a mutable state object.
 */

export interface IdentityVersion {
  versionHash: string;
  derivedAtTs: number;
}

export interface IdentityConfidence {
  score: number;
  evidenceEventIds: string[];
}

export interface IdentityObservation {
  eventId: string;
  observedValue: unknown;
  ts: number;
}

export interface IdentityAliasEdge {
  fromIdentityId: string;
  toIdentityId: string;
  aliasEventId: string;
  confidence: IdentityConfidence;
}

export interface IdentityLineage {
  sourceEventId: string;
  creatorSessionId: string;
  observations: IdentityObservation[];
  aliases: IdentityAliasEdge[];
}

export interface SemanticIdentity {
  id: string; // Cryptographic hash of extraction value + sourceEventId + creatorSessionId
  baseType: string;
  lineage: IdentityLineage;
  currentVersion: IdentityVersion;
}
