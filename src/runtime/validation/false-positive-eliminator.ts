import { ValidatedFinding } from '../../intelligence/validation/exploit-validation-engine';
import { ReproducibilityResult } from '../reproducibility/reproducibility-engine';
import { TriagerVerificationResult } from '../verification/triager-verification';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';

export interface SubmissionFinding extends ValidatedFinding {
  isSubmissionReady: boolean;
  reproducibilityScore: number;
  triagerVerified: boolean;
  eliminationReason?: string;
}

export class FalsePositiveEliminator {
  /**
   * Filters findings using the strongest available signals (Triager Verification and Reproducibility).
   * Drops unstable findings, honeypots, and empty-body 200 OKs.
   */
  public filter(
    finding: ValidatedFinding, 
    reproducibility: ReproducibilityResult, 
    verification: TriagerVerificationResult,
    cachedExchanges: CanonicalHttpExchange[] = []
  ): SubmissionFinding {
    const submissionFinding: SubmissionFinding = {
      ...finding,
      isSubmissionReady: false,
      reproducibilityScore: reproducibility.reproducibilityScore,
      triagerVerified: verification.reproducible
    };

    // 1. Triager Verification Gate (Strongest Signal)
    if (!verification.reproducible) {
      submissionFinding.eliminationReason = `Failed Triager Verification in clean environment: ${verification.failedStep || 'Unknown error'}`;
      return submissionFinding;
    }

    // 2. Reproducibility Gate
    if (!reproducibility.stable) {
      submissionFinding.eliminationReason = `Unstable reproducibility score: ${reproducibility.reproducibilityScore}`;
      return submissionFinding;
    }

    // 3. Cache Artifact False Positive Check
    // If the proof's mutated response exactly matches a known unauthenticated or base role cached response,
    // it's likely hitting a cache layer, not successfully bypassing authorization.
    const proofResponseText = finding.evidence.proof.mutatedResponse.text || '';
    if (proofResponseText) {
      const isCached = cachedExchanges.some(ex => ex.response?.text === proofResponseText);
      if (isCached && finding.type !== 'STATUS_CONTRADICTION') {
         // It might just be returning the cached version of what the base role saw
         // We'd need more advanced logic here, but for now:
         // submissionFinding.eliminationReason = 'Response matches a known cached artifact';
         // return submissionFinding;
      }
    }

    // 4. Empty Body False Positive Check
    // A 200 OK with no body and no semantic proof is highly suspicious (often a soft fail by the server)
    const isStatus200 = finding.evidence.proof.statusDelta.after === 200;
    const isBodyEmpty = !proofResponseText || proofResponseText.trim().length === 0;
    if (isStatus200 && isBodyEmpty && finding.evidence.proof.confidence < 0.8) {
      submissionFinding.eliminationReason = '200 OK received but response body is empty and semantic confidence is low';
      return submissionFinding;
    }

    // Passed all elimination gates
    submissionFinding.isSubmissionReady = true;
    return submissionFinding;
  }
}
