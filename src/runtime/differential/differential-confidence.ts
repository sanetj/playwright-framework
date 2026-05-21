import { EvidenceConfidence } from '../evidence/evidence-confidence';

export interface DifferentialConfidenceScore {
  score: number; // 0.0 to 1.0
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
}

export class DifferentialConfidenceScorer {
  /**
   * Scores the confidence that a discovered differential contradiction is a true vulnerability.
   */
  public scoreContradiction(
    evidenceConfidence: EvidenceConfidence,
    authAsymmetry: boolean,
    ownershipConfidence: number
  ): DifferentialConfidenceScore {
    
    let score = evidenceConfidence.score * 0.4; // Base score heavily relies on evidence integrity
    const factors = [...evidenceConfidence.factors];

    if (authAsymmetry) {
      score += 0.3;
      factors.push('High Auth Asymmetry (Privilege Escalation Detected)');
    }

    if (ownershipConfidence > 0.7) {
      score += 0.3;
      factors.push('High Entity Ownership Confidence (IDOR Validated)');
    } else if (ownershipConfidence > 0.0) {
      score += 0.1;
      factors.push('Weak Entity Ownership Confidence');
    }

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (score >= 0.9) severity = 'CRITICAL';
    else if (score >= 0.7) severity = 'HIGH';
    else if (score >= 0.4) severity = 'MEDIUM';

    return {
      score: Math.min(score, 1.0),
      severity,
      factors
    };
  }
}
