import { PrioritizedCandidate } from '../scoring/candidate-scoring-contracts';
import { 
  AttackGraphEdge, 
  AttackGraphNode, 
  InvestigationAttackGraph 
} from './attack-graph-contracts';

/**
 * @architecture_authority Investigation Graph Builder
 * @responsibility Consumes prioritized candidates to construct a deterministic multi-step investigation graph.
 * @determinism Generates purely deterministic edges based on exact string-matching of existing structural context.
 */
export class AttackGraphBuilder {
  
  public buildGraph(candidates: PrioritizedCandidate[]): InvestigationAttackGraph {
    const nodes: AttackGraphNode[] = [];
    const edges: AttackGraphEdge[] = [];

    // 1. Construct Nodes
    for (const cand of candidates) {
      nodes.push({
        candidateId: cand.candidateIdentity,
        priorityRank: cand.priorityRank
      });
    }

    // 2. Discover Edges Conservatively
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i];
        const b = candidates[j];

        // Edge Rule 1: Shared Resource Context
        if (a.targetEntityId === b.targetEntityId) {
          edges.push({
            sourceCandidateId: a.candidateIdentity,
            targetCandidateId: b.candidateIdentity,
            semanticType: 'SHARED_RESOURCE'
          });
        }

        // Edge Rule 2: Shared Actor Context (Role intersection)
        if (a.baseRoleContext === b.baseRoleContext || a.comparisonRoleContext === b.comparisonRoleContext) {
          edges.push({
            sourceCandidateId: a.candidateIdentity,
            targetCandidateId: b.candidateIdentity,
            semanticType: 'SHARED_ACTOR_CONTEXT'
          });
        }

        // Edge Rule 3: Shared Ownership Boundary
        const sharedOwnership = a.ownershipReferences.some(ref => b.ownershipReferences.includes(ref));
        if (sharedOwnership) {
          edges.push({
            sourceCandidateId: a.candidateIdentity,
            targetCandidateId: b.candidateIdentity,
            semanticType: 'SHARED_OWNERSHIP_BOUNDARY'
          });
        }
      }
    }

    // 3. Deterministic Sorting
    // Nodes are implicitly sorted by priorityRank because they were built from a sorted array,
    // but we enforce it strictly anyway.
    nodes.sort((a, b) => a.priorityRank - b.priorityRank);
    
    // Edges are sorted lexicographically to guarantee graph reproducible equality
    edges.sort((a, b) => {
      const typeComp = a.semanticType.localeCompare(b.semanticType);
      if (typeComp !== 0) return typeComp;
      
      const sourceComp = a.sourceCandidateId.localeCompare(b.sourceCandidateId);
      if (sourceComp !== 0) return sourceComp;
      
      return a.targetCandidateId.localeCompare(b.targetCandidateId);
    });

    // 4. Graph Identity Generation
    const nodeIds = nodes.map(n => n.candidateId).join('|');
    const edgeSignatures = edges.map(e => `${e.sourceCandidateId}-${e.semanticType}-${e.targetCandidateId}`).join('|');
    const graphIdentity = `graph_${this.simpleHash(nodeIds + edgeSignatures)}`;

    return {
      graphIdentity,
      nodes,
      edges
    };
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
