/**
 * @canonical
 * Memory Stratification Contracts
 * Defines the layers of semantic persistence, from raw telemetry (L0) to abstract sidecar cognition (L4).
 */

export enum MemoryLayer {
  L0_RAW_TELEMETRY = 'L0_RAW_TELEMETRY',
  L1_NORMALIZED_EVENTS = 'L1_NORMALIZED_EVENTS',
  L2_RUNTIME_GRAPH = 'L2_RUNTIME_GRAPH',
  L3_SEMANTIC_TOPOLOGY = 'L3_SEMANTIC_TOPOLOGY',
  L4_SIDECAR_COGNITION = 'L4_SIDECAR_COGNITION',
}

export interface MemoryRetentionPolicy {
  layer: MemoryLayer;
  ttlMs: number;
  preserveOnAnomaly: boolean;
}

export interface MemoryDecayClass {
  classId: string;
  triggerCondition: 'TIME_ELAPSED' | 'SESSION_ENDED' | 'COMPRESSION_ACHIEVED';
  targetLayer: MemoryLayer;
}

export interface SemanticPersistenceRule {
  ruleId: string;
  appliesToLayer: MemoryLayer;
  persistenceCriteria: 'ALWAYS' | 'ON_SECURITY_FINDING' | 'ON_EXPLICIT_SAVE';
}

export interface CrossSessionProjection {
  projectionId: string;
  sourceSessionIds: string[];
  abstractedTopologyHash: string;
  targetMemoryLayer: MemoryLayer.L3_SEMANTIC_TOPOLOGY | MemoryLayer.L4_SIDECAR_COGNITION;
}
