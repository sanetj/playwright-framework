import { InvestigationCandidate } from '../synthesis/investigation-candidate-model';
import { CandidateScore, CandidateScoreComponent } from './candidate-scoring-contracts';

/**
 * @architecture_authority Candidate Scoring Engine
 * @responsibility Evaluates an InvestigationCandidate using deterministic, explainable structural rules.
 * @determinism Does not query external systems. Does not use probability. Relies purely on array lengths.
 */
export class CandidateScoringEngine {
  
  public calculateScore(candidate: InvestigationCandidate): CandidateScore {
    const components: CandidateScoreComponent[] = [];
    let totalScore = 0;

    // 1. Evidence Breadth: More supporting network exchanges implies a more complex/verified state flow.
    const evidenceCount = candidate.evidenceExchangeIds.length;
    const evidenceScore = evidenceCount * 10;
    components.push({
      name: 'Evidence Breadth',
      score: evidenceScore,
      reason: `Candidate is supported by ${evidenceCount} canonical replay exchange(s).`
    });
    totalScore += evidenceScore;

    // 2. Validation Breadth: More merged findings implies a higher severity of failure across roles.
    const validationCount = candidate.validatedFindingIds.length;
    const validationScore = validationCount * 20;
    components.push({
      name: 'Validation Breadth',
      score: validationScore,
      reason: `Candidate successfully merged ${validationCount} validated finding(s).`
    });
    totalScore += validationScore;

    // 3. Ownership Complexity: Crossing authorization boundaries increases severity.
    const ownershipCount = candidate.ownershipReferences.length;
    const ownershipScore = ownershipCount * 15;
    components.push({
      name: 'Ownership Complexity',
      score: ownershipScore,
      reason: `Candidate interacts with ${ownershipCount} explicit ownership/authorization boundaries.`
    });
    totalScore += ownershipScore;

    return {
      totalScore,
      components
    };
  }
}
