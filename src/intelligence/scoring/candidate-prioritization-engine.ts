import { InvestigationCandidate } from '../synthesis/investigation-candidate-model';
import { PrioritizedCandidate } from './candidate-scoring-contracts';
import { CandidateScoringEngine } from './candidate-scoring-engine';

/**
 * @architecture_authority Candidate Prioritization Engine
 * @responsibility Sorts scored Candidates into a strictly deterministic ordering.
 * @determinism Uses exact numerical scores with absolute String localeCompare fallbacks.
 */
export class CandidatePrioritizationEngine {
  private scoringEngine = new CandidateScoringEngine();

  public prioritize(candidates: InvestigationCandidate[]): PrioritizedCandidate[] {
    const scoredCandidates = candidates.map(candidate => ({
      ...candidate,
      score: this.scoringEngine.calculateScore(candidate)
    }));

    // Deterministic Sorting:
    // 1. Total Score (Descending)
    // 2. Validation Breadth (Descending)
    // 3. Alphabetical Candidate Identity (Ascending)
    scoredCandidates.sort((a, b) => {
      if (a.score.totalScore !== b.score.totalScore) {
        return b.score.totalScore - a.score.totalScore;
      }
      
      const aValScore = a.score.components.find(c => c.name === 'Validation Breadth')?.score || 0;
      const bValScore = b.score.components.find(c => c.name === 'Validation Breadth')?.score || 0;
      if (aValScore !== bValScore) {
        return bValScore - aValScore;
      }

      return a.candidateIdentity.localeCompare(b.candidateIdentity);
    });

    // Assign final priority ranks
    return scoredCandidates.map((candidate, index) => ({
      ...candidate,
      priorityRank: index + 1
    }));
  }
}
