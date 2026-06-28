import { InvestigationCandidate } from '../synthesis/investigation-candidate-model';

/**
 * @architecture_authority Candidate Scoring
 * @responsibility Defines the deterministic, read-only representation of Candidate Priority.
 * @invariants
 * - Scores never modify the underlying Candidate.
 * - Score components must be explicitly explainable.
 * - Scores only reference Candidate structural attributes.
 */

export interface CandidateScoreComponent {
  readonly name: string;
  readonly score: number;
  readonly reason: string;
}

export interface CandidateScore {
  readonly totalScore: number;
  readonly components: readonly CandidateScoreComponent[];
}

export interface PrioritizedCandidate extends InvestigationCandidate {
  readonly score: CandidateScore;
  readonly priorityRank: number; // 1 is highest priority
}
