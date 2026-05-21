import { ActorContext } from '../events/normalized-event';

/**
 * @canonical
 * Cognition Primitives - Core Semantic Ontology for the Intelligence Platform
 */

/**
 * Extends the canonical ActorContext with lineage and tenant context.
 */
export interface CognitionActor extends ActorContext {
  tenantId?: string;
  lineageId: string;
}

/**
 * Tracks the semantic session of an actor over time.
 */
export interface CognitionSession {
  sessionId: string;
  actor: CognitionActor;
  startedAt: number;
  lastActive: number;
  tags: string[];
}

export interface WorkflowObservation {
  id: string;
  ts: number;
  confidence: number;
  description: string;
  evidenceIds: string[];
}

export interface WorkflowContext {
  workflowId: string;
  name: string;
  isActive: boolean;
  observations: WorkflowObservation[];
}

export type IntentCategory =
  | 'Observe'
  | 'Infer'
  | 'Replay'
  | 'Mutate'
  | 'Escalate'
  | 'Stress'
  | 'Discover';

export enum RiskCategory {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface PolicyDecision {
  id: string;
  ts: number;
  intent: IntentCategory;
  allowed: boolean;
  risk: RiskCategory;
  reason: string;
  evidenceIds: string[];
}
