export interface ConfidenceMetrics {
  evidenceConfidence: number; // Reliability of the lineage capture (0-1)
  proofConfidence: number;    // Mathematical certainty of boundary bypass (0-1)
}

/**
 * Separates Evidence Confidence from Proof Confidence.
 * Prevents strong evidence (perfect capture) from masking a weak causal link.
 */
export class ConfidenceCalculator {
  
  public calculateEvidenceConfidence(lineageCaptured: boolean, statusCodeStability: boolean): number {
    let score = 0.0;
    if (lineageCaptured) score += 0.8;
    if (statusCodeStability) score += 0.2;
    return score;
  }

  public calculateProofConfidence(semanticLeakageDetected: boolean, roleMismatchVerified: boolean): number {
    let score = 0.0;
    if (roleMismatchVerified) score += 0.4;
    if (semanticLeakageDetected) score += 0.6;
    return score;
  }

  public getMetrics(
    lineageCaptured: boolean, 
    statusCodeStability: boolean, 
    semanticLeakageDetected: boolean, 
    roleMismatchVerified: boolean
  ): ConfidenceMetrics {
    return {
      evidenceConfidence: this.calculateEvidenceConfidence(lineageCaptured, statusCodeStability),
      proofConfidence: this.calculateProofConfidence(semanticLeakageDetected, roleMismatchVerified)
    };
  }
}
