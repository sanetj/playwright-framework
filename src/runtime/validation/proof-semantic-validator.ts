import { ProofConfidence } from '../../runtime/evidence/exploit-proof-capture';
import { CanonicalHttpResponse } from '../../runtime/evidence/canonical-http-evidence';

export interface SemanticValidationResult {
  isValidated: boolean;
  confidence: ProofConfidence;
  semanticEvidence: string[];
}

/**
 * @architecture_authority Semantic Evidence Assessment
 * @responsibility Evaluates response payloads for deterministic proofs of data leakage.
 * @allowed_dependencies Base Types, DTOs
 * @forbidden_dependencies Live Execution, Replay Orchestration
 * @determinism Pure function. Identical original + mutated responses MUST yield identical validation results.
 */
export class ProofSemanticValidator {
  public validate(
    originalResponse: CanonicalHttpResponse | undefined,
    mutatedResponse: CanonicalHttpResponse,
    mutationTarget: string // e.g. the injected ID or tenant
  ): SemanticValidationResult {
    const evidence: string[] = [];
    let confidence: ProofConfidence = 'LOW';
    let isValidated = false;

    if (!originalResponse) {
      return { isValidated: false, confidence: 'LOW', semanticEvidence: ['No original response available'] };
    }

    // 1. Status Check - Prerequisite but insufficient on its own
    if (originalResponse.status >= 400 && mutatedResponse.status >= 200 && mutatedResponse.status < 300) {
      evidence.push(`Status changed from ${originalResponse.status} to ${mutatedResponse.status}`);
    } else if (originalResponse.status >= 200 && originalResponse.status < 300 && mutatedResponse.status >= 200 && mutatedResponse.status < 300) {
      evidence.push('Status remained successful (possible BOLA/tenant isolation bypass)');
    } else {
      return { isValidated: false, confidence: 'LOW', semanticEvidence: ['Mutation did not result in a successful status code'] };
    }

    // 2. Semantic Data Leakage Check
    if (mutatedResponse.bodyStr) {
      if (mutatedResponse.bodyStr !== originalResponse.bodyStr) {
        evidence.push('Response body contents mutated');
        isValidated = true;
        confidence = 'MEDIUM';
        
        // Did it leak the targeted entity?
        if (mutationTarget && mutatedResponse.bodyStr.includes(mutationTarget)) {
           evidence.push('Mutated response contains the targeted entity ID');
           confidence = 'HIGH';
        }
        
        // Did it leak sensitive fields?
        const sensitiveFields = ['email', 'password', 'token', 'admin', 'role', 'secret', 'credit_card'];
        for (const field of sensitiveFields) {
          // crude check, but semantically verifies exposure
          if (mutatedResponse.bodyStr.toLowerCase().includes(`"${field}"`)) {
             evidence.push(`Exposed sensitive field: ${field}`);
             confidence = 'HIGH';
          }
        }
      } else {
        evidence.push('Response body identical to original. No semantic leakage proven.');
        // If it's identical, it didn't really leak anything new, so we haven't proven exploitability
        isValidated = false;
        confidence = 'LOW';
      }
    } else {
       // If no body, and it was a state mutating request (e.g. DELETE returning 204)
       if (mutatedResponse.status === 204 || mutatedResponse.status === 201) {
         evidence.push('State mutating request succeeded without body.');
         isValidated = true;
         confidence = 'HIGH';
       } else {
         evidence.push('No response body to validate leakage.');
         isValidated = false;
       }
    }

    return {
      isValidated,
      confidence,
      semanticEvidence: evidence
    };
  }
}
