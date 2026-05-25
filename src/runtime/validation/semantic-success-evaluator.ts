import { ProofSemanticValidator } from '../../intelligence/validation/proof-semantic-validator';

export interface SemanticSuccessResult {
  successful: boolean;
  confidence: number;
}

export class SemanticSuccessEvaluator {
  private semanticValidator = new ProofSemanticValidator();

  /**
   * Evaluates if a replay was semantically successful, ignoring dynamic noise (like CSRF tokens).
   * It does this by checking if the sensitive entity leaked or authorization boundaries were violated,
   * rather than doing a byte-for-byte comparison of the raw response.
   * 
   * @param originalResponse The original response (before mutation)
   * @param replayResponse The response obtained during this replay attempt
   * @param targetEntity The ID or string that was expected to leak
   */
  public evaluate(originalResponse: any, replayResponse: any, targetEntity: string): SemanticSuccessResult {
    if (!replayResponse) {
      return { successful: false, confidence: 0 };
    }

    // 1. Status Code Heuristics
    // If we originally got a 403, and now we get a 200, that's a strong signal,
    // but we still need semantic proof to ensure it's not a generic 200 empty body.
    const originalStatus = originalResponse?.status || 0;
    const replayStatus = replayResponse?.status || 0;
    const isStatusEscalation = (originalStatus === 403 || originalStatus === 401) && (replayStatus >= 200 && replayStatus < 300);

    // 2. Semantic Leakage Check
    // We delegate to the semantic validator to see if the target entity actually leaked
    // into the replay response body.
    const semanticResult = this.semanticValidator.validate(originalResponse, replayResponse, targetEntity);

    if (semanticResult.leakedEntities.length > 0) {
      return { successful: true, confidence: 0.95 };
    }

    if (semanticResult.hasSemanticChange && isStatusEscalation) {
      // It's a 200 OK and the body is structurally different, meaning we likely bypassed auth
      return { successful: true, confidence: 0.85 };
    }

    if (semanticResult.hasSemanticChange) {
      // Body changed, but no clear entity leak and no status escalation.
      // Might be successful, but low confidence.
      return { successful: true, confidence: 0.6 };
    }

    // If there was no semantic change and no leak, the replay failed to reproduce the exploit.
    return { successful: false, confidence: 0 };
  }
}
