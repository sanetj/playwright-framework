import { DeterminismCheckResult } from '../replay/replay-determinism';

export class ContradictionStabilityEvaluator {
  /**
   * Evaluates if a contradiction is stable enough to be reported as a vulnerability.
   * Suppresses contradictions caused by auth-state ambiguity or replay instability.
   */
  public isStable(determinismCheck: DeterminismCheckResult, hasAmbiguousAuthState: boolean): boolean {
    // 1. Replay Instability Suppression
    if (!determinismCheck.isDeterministic) {
      return false; // The endpoint yields different results on identical replays, likely noise.
    }

    // 2. Auth-State Ambiguity Suppression
    // If the framework is unsure if the auth injection succeeded or if cookies expired,
    // any 401/403 contradictions are highly suspect.
    if (hasAmbiguousAuthState) {
      return false; 
    }

    return true;
  }
}
