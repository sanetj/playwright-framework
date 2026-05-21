export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CERTAIN = 'CERTAIN'
}

export interface EvidenceConfidence {
  level: ConfidenceLevel;
  score: number; // 0.0 to 1.0
  factors: string[];
}

export class EvidenceConfidenceScorer {
  /**
   * Scores the confidence of an evidence trace based on various factors.
   */
  public scoreEvidence(hasDeterministicReplay: boolean, hasClearAuthBoundary: boolean, isStructurallyConsistent: boolean): EvidenceConfidence {
    let score = 0.2; // Base score
    const factors: string[] = [];

    if (hasDeterministicReplay) {
      score += 0.4;
      factors.push('Deterministic Replay Verified');
    } else {
      factors.push('Replay Consistency Unknown or Failed');
    }

    if (hasClearAuthBoundary) {
      score += 0.2;
      factors.push('Clear Auth Boundary Crossed');
    }

    if (isStructurallyConsistent) {
      score += 0.2;
      factors.push('Structural Response Consistency Verified');
    }

    let level = ConfidenceLevel.LOW;
    if (score >= 0.9) level = ConfidenceLevel.CERTAIN;
    else if (score >= 0.7) level = ConfidenceLevel.HIGH;
    else if (score >= 0.5) level = ConfidenceLevel.MEDIUM;

    return {
      level,
      score: Math.min(score, 1.0),
      factors
    };
  }
}
