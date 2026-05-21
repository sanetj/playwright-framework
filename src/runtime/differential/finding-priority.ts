export enum FindingPriorityLevel {
  P1_CRITICAL = 'P1_CRITICAL',
  P2_HIGH = 'P2_HIGH',
  P3_MEDIUM = 'P3_MEDIUM',
  P4_LOW = 'P4_LOW',
  P5_INFORMATIONAL = 'P5_INFORMATIONAL'
}

export class FindingPriorityRanker {
  /**
   * Ranks a finding based on a combination of ROI, Evidence Confidence, and Reproducibility.
   * This is entirely deterministic and heuristic-backed, no opaque AI scoring.
   */
  public rankFinding(
    roiScore: number, 
    evidenceConfidenceScore: number, 
    reproducibilityScore: number
  ): FindingPriorityLevel {
    
    // Weighted combination
    // ROI is 50%, Reproducibility is 30%, Evidence Confidence is 20%
    const combinedScore = (roiScore * 0.5) + (reproducibilityScore * 100 * 0.3) + (evidenceConfidenceScore * 100 * 0.2);

    if (combinedScore >= 85) return FindingPriorityLevel.P1_CRITICAL;
    if (combinedScore >= 65) return FindingPriorityLevel.P2_HIGH;
    if (combinedScore >= 45) return FindingPriorityLevel.P3_MEDIUM;
    if (combinedScore >= 25) return FindingPriorityLevel.P4_LOW;
    
    return FindingPriorityLevel.P5_INFORMATIONAL;
  }
}
