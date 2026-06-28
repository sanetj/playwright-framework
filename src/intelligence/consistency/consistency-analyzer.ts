import { InvestigationAttackGraph } from '../graphs/attack-graph-contracts';
import { PrioritizedCandidate } from '../scoring/candidate-scoring-contracts';
import { ConsistencyReport, StructuralContradiction } from './consistency-contracts';

/**
 * @architecture_authority Consistency Analyzer
 * @responsibility Evaluates an Attack Graph for deterministic structural contradictions.
 * @determinism Read-only graph traversal. Zero heuristics or probability used.
 */
export class ConsistencyAnalyzer {

  public analyze(graph: InvestigationAttackGraph, candidates: PrioritizedCandidate[]): ConsistencyReport {
    const contradictions: StructuralContradiction[] = [];
    let checksPerformed = 0;

    const candidateMap = new Map<string, PrioritizedCandidate>();
    for (const cand of candidates) {
      candidateMap.set(cand.candidateIdentity, cand);
    }

    // 1. Rule: DISCONNECTED_INVESTIGATION_PROGRESSION
    // Checks if any HIGH priority node has exactly 0 edges, indicating an isolated anomaly.
    for (const node of graph.nodes) {
      checksPerformed++;
      const isConnected = graph.edges.some(e => e.sourceCandidateId === node.candidateId || e.targetCandidateId === node.candidateId);
      
      if (!isConnected && node.priorityRank <= 3) {
        const idMat = `isolated_${node.candidateId}`;
        contradictions.push({
          contradictionIdentity: `contra_${this.simpleHash(idMat)}`,
          category: 'INVESTIGATION_PROGRESSION',
          participatingCandidateIds: [node.candidateId],
          participatingEdgeIds: [],
          severity: 'HIGH',
          description: `Candidate ${node.candidateId} is highly prioritized (Rank ${node.priorityRank}) but structurally isolated from the rest of the investigation graph.`
        });
      }
    }

    // 2. Rule: MUTUALLY_EXCLUSIVE_ACTOR_CONTEXT
    // Checks if two candidates share a structural resource but were executed under entirely disjoint authorization roles.
    for (const edge of graph.edges) {
      checksPerformed++;
      if (edge.semanticType === 'SHARED_RESOURCE') {
        const source = candidateMap.get(edge.sourceCandidateId);
        const target = candidateMap.get(edge.targetCandidateId);

        if (source && target) {
          const sourceRoles = [source.baseRoleContext, source.comparisonRoleContext].filter(Boolean);
          const targetRoles = [target.baseRoleContext, target.comparisonRoleContext].filter(Boolean);

          const hasOverlap = sourceRoles.some(r => targetRoles.includes(r));
          if (!hasOverlap) {
            const edgeId = `${edge.sourceCandidateId}-${edge.semanticType}-${edge.targetCandidateId}`;
            const idMat = `actor_conflict_${edgeId}`;
            contradictions.push({
              contradictionIdentity: `contra_${this.simpleHash(idMat)}`,
              category: 'ACTOR_CONSISTENCY',
              participatingCandidateIds: [source.candidateIdentity, target.candidateIdentity].sort(),
              participatingEdgeIds: [edgeId],
              severity: 'MEDIUM',
              description: `A SHARED_RESOURCE edge connects two completely distinct actor contexts (${sourceRoles.join(',')} vs ${targetRoles.join(',')}), suggesting a multi-tenant authorization bleed or conflicting test state.`
            });
          }
        }
      }
    }

    // Deterministically sort contradictions to guarantee identity consistency
    contradictions.sort((a, b) => a.contradictionIdentity.localeCompare(b.contradictionIdentity));

    return {
      graphIdentity: graph.graphIdentity,
      totalChecksPerformed: checksPerformed,
      contradictions,
      isStructurallyConsistent: contradictions.length === 0
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
