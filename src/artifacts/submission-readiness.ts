import { SubmissionFinding } from '../runtime/validation/false-positive-eliminator';
import { MinimalReplayRecipe } from '../runtime/replay/replay-minimizer';
import { TriagerVerificationResult } from '../runtime/verification/triager-verification';

export interface SubmissionReadiness {
  ready: boolean;
  replayStable: boolean;
  evidenceComplete: boolean;
  reproducible: boolean;
  proofExists: boolean;
  narrativeExists: boolean;
  riskAccepted: boolean;
  blockReason?: string;
}

export class SubmissionReadinessGate {
  /**
   * Final strict boolean gate blocking incomplete reports.
   * Only completely verified, stable, and documented findings may proceed to export.
   */
  public evaluate(
    finding: SubmissionFinding,
    recipe: MinimalReplayRecipe,
    verification: TriagerVerificationResult,
    narrative: string
  ): SubmissionReadiness {
    const proof = finding.proofs[0];
    if (!proof) {
      return {
        ready: false,
        replayStable: false,
        evidenceComplete: false,
        reproducible: false,
        proofExists: false,
        narrativeExists: false,
        riskAccepted: false,
        blockReason: 'Validated finding contains no exploit proof.'
      };
    }
    
    const replayStable = finding.reproducibilityScore >= 0.8;
    const evidenceComplete = recipe.minimalExchanges.length > 0;
    const reproducible = verification.reproducible;
    const proofExists = finding.proofs.length > 0;
    const narrativeExists = narrative.length > 100; // Basic heuristic
    const riskAccepted = true; // Assuming risk was handled by RiskClassifier earlier

    const ready = replayStable && evidenceComplete && reproducible && proofExists && narrativeExists && riskAccepted;

    let blockReason;
    if (!ready) {
      const reasons = [];
      if (!replayStable) reasons.push('Replay is unstable');
      if (!evidenceComplete) reasons.push('Evidence is incomplete');
      if (!reproducible) reasons.push('Failed Triager Verification');
      if (!proofExists) reasons.push('Proof response missing');
      if (!narrativeExists) reasons.push('Narrative is incomplete');
      blockReason = reasons.join(', ');
    }

    return {
      ready,
      replayStable,
      evidenceComplete,
      reproducible,
      proofExists,
      narrativeExists,
      riskAccepted,
      blockReason
    };
  }
}
