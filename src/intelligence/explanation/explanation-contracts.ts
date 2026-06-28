/**
 * @architecture_authority Explanation Planning Contracts
 * @responsibility Defines the deterministic, read-only sequence of explanation steps for downstream serializers.
 * @invariants
 * - Explanation Planning never generates narrative text or markdown.
 * - Explanation Planning only establishes the canonical presentation order of existing intelligence.
 */

export type ExplanationStepCategory = 
  | 'REPLAY_FOUNDATION'
  | 'CANDIDATE_INTRODUCTION'
  | 'ATTACK_PROGRESSION'
  | 'CONSISTENCY_REVIEW'
  | 'NOVELTY_OBSERVATION'
  | 'SUFFICIENCY_ASSESSMENT'
  | 'FINAL_SUMMARY';

export interface ExplanationStep {
  readonly stepIdentity: string;
  readonly category: ExplanationStepCategory;
  readonly referencedIds: readonly string[]; // IDs of candidates, graphs, reports, etc.
  readonly dependsOn: readonly string[]; // IDs of preceding explanation steps
}

export interface ExplanationPlan {
  readonly planIdentity: string;
  readonly investigationId: string;
  readonly orderedSteps: readonly ExplanationStep[];
}
