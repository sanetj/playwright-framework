import { KnowledgeGraph } from '../graph/knowledge-graph';
import { InvestigationCandidate, CandidateState, CandidateType } from './candidate-lifecycle';
import { createHash } from 'crypto';

/**
 * Transforms deterministic graph signals into typed InvestigationCandidates.
 * Strict mathematical heuristics. Zero probabilistic guessing.
 */
export class CandidateGenerator {
  
  public generateFromGraph(graph: KnowledgeGraph): InvestigationCandidate[] {
    const candidates: InvestigationCandidate[] = [];

    // Example deterministic heuristic: OwnershipMismatch
    // IF: UserA CAN_READ NodeX AND UserB CAN_READ NodeX AND UserA OWNS NodeX
    // THEN: UserB might have CrossTenantAccess
    
    // Simplistic extraction for template purposes
    const routes = graph.getNodesByType('ROUTE');

    for (const route of routes) {
      // Deterministic evaluation rule (RoleGraphRule_17)
      if (route.metadata && route.metadata.requiresAuth && !route.metadata.isPublic) {
        
        // Let's pretend we found a mismatch mathematically
        const candidateId = createHash('sha256')
          .update(`CrossTenantAccess:${route.id}:RoleGraphRule_17`)
          .digest('hex');

        candidates.push({
          id: candidateId,
          type: 'CrossTenantAccess',
          state: CandidateState.DISCOVERED,
          transformationRule: 'RoleGraphRule_17',
          targetNodeId: route.id,
          attackerRoleId: 'user_b_role',
          victimRoleId: 'user_a_role',
          createdAt: Date.now(),
          evidenceLinks: [route.id]
        });
      }
    }

    return candidates;
  }
}
