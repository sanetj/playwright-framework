import { EvidenceLineageChain } from '../evidence/evidence-lineage-chain';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';

export interface StateDependencyResult {
  stateDependent: boolean;
  confidence: number;
  reason: string;
}

export class StateDependencyDetector {
  /**
   * Analyzes the given lineage and the original exchanges to determine if the finding 
   * requires FULL_REPLAY (state dependent) or can use MUTATION_ONLY.
   */
  public analyze(lineage: EvidenceLineageChain, exchanges: CanonicalHttpExchange[]): StateDependencyResult {
    if (!lineage || lineage.sourceExchangeIds.length === 0) {
      return { stateDependent: false, confidence: 1.0, reason: 'No source lineage found' };
    }

    const primaryExchangeId = lineage.sourceExchangeIds[0];
    const primaryExchange = exchanges.find(ex => ex.exchangeId === primaryExchangeId);

    if (!primaryExchange) {
      return { stateDependent: false, confidence: 0.5, reason: 'Source exchange not found in context' };
    }

    // Heuristics for state dependency
    const req = primaryExchange.request;
    
    // 1. Check if the method typically mutates state (POST, PUT, DELETE, PATCH)
    // If we are mutating a resource, we often need the full state built up 
    // to pass validation rules (e.g. CSRF tokens, step-by-step wizards)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return { 
        stateDependent: true, 
        confidence: 0.8, 
        reason: `HTTP ${req.method} typically relies on complex workflow state` 
      };
    }

    // 2. Check for dynamic headers that imply active session tracking
    // If the request requires anti-forgery tokens, it's highly state dependent
    const hasDynamicHeaders = Object.keys(req.headers).some(h => 
      h.toLowerCase().includes('csrf') || 
      h.toLowerCase().includes('nonce') ||
      h.toLowerCase().includes('xsrf')
    );

    if (hasDynamicHeaders) {
      return {
        stateDependent: true,
        confidence: 0.9,
        reason: 'Request contains CSRF/Nonce headers requiring fresh state generation'
      };
    }

    // 3. Fallback: GET requests are often reproducible in isolation (MUTATION_ONLY)
    return {
      stateDependent: false,
      confidence: 0.7,
      reason: 'Simple GET request without complex state headers'
    };
  }
}
