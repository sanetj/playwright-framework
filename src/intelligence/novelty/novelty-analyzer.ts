import { InvestigationAttackGraph } from '../graphs/attack-graph-contracts';
import { ConsistencyReport } from '../consistency/consistency-contracts';
import { NoveltyObservation, StructuralNoveltyReport } from './novelty-contracts';

/**
 * @architecture_authority Structural Novelty Analyzer
 * @responsibility Evaluates topological uniqueness of an Attack Graph and its Consistency Report.
 * @determinism Purely mathematical evaluation of node degrees, edge types, and consistency counts.
 */
export class NoveltyAnalyzer {

  public analyze(graph: InvestigationAttackGraph, consistencyReport: ConsistencyReport): StructuralNoveltyReport {
    const observations: NoveltyObservation[] = [];

    // 1. Rule: HIGH_DENSITY_AUTHORIZATION_NEXUS (Authorization Novelty)
    // Identifies if a single node participates in >= 3 SHARED_OWNERSHIP_BOUNDARY edges.
    const ownershipDegreeMap = new Map<string, number>();
    for (const edge of graph.edges) {
      if (edge.semanticType === 'SHARED_OWNERSHIP_BOUNDARY') {
        ownershipDegreeMap.set(edge.sourceCandidateId, (ownershipDegreeMap.get(edge.sourceCandidateId) || 0) + 1);
        ownershipDegreeMap.set(edge.targetCandidateId, (ownershipDegreeMap.get(edge.targetCandidateId) || 0) + 1);
      }
    }

    for (const [candidateId, degree] of ownershipDegreeMap.entries()) {
      if (degree >= 3) {
        const idMat = `auth_nexus_${graph.graphIdentity}_${candidateId}`;
        observations.push({
          noveltyIdentity: `nov_${this.simpleHash(idMat)}`,
          category: 'AUTHORIZATION_NOVELTY',
          participatingCandidateIds: [candidateId],
          participatingGraphIds: [graph.graphIdentity],
          supportingConsistencyReferences: [],
          structuralDescription: `Candidate ${candidateId} functions as an authorization nexus, sharing ownership boundaries with ${degree} other candidates. This represents highly concentrated, cross-boundary access topology.`
        });
      }
    }

    // 2. Rule: PERFECT_COMPLEX_CONSISTENCY (Correlation Novelty)
    // Identifies a dense graph (>= 3 nodes, >= 2 edges) that possesses absolutely zero structural contradictions.
    if (graph.nodes.length >= 3 && graph.edges.length >= 2) {
      if (consistencyReport.isStructurallyConsistent && consistencyReport.contradictions.length === 0) {
        const idMat = `perf_consist_${graph.graphIdentity}`;
        observations.push({
          noveltyIdentity: `nov_${this.simpleHash(idMat)}`,
          category: 'CORRELATION_NOVELTY',
          participatingCandidateIds: graph.nodes.map(n => n.candidateId).sort(),
          participatingGraphIds: [graph.graphIdentity],
          supportingConsistencyReferences: [consistencyReport.graphIdentity],
          structuralDescription: `The attack graph represents a complex multi-step workflow (${graph.nodes.length} nodes, ${graph.edges.length} transitions) with zero structural contradictions. This signifies a perfectly consistent, highly sophisticated exploit chain.`
        });
      }
    }

    // Deterministic sorting
    observations.sort((a, b) => a.noveltyIdentity.localeCompare(b.noveltyIdentity));
    
    const uniqueCategories = new Set(observations.map(o => o.category));

    return {
      reportIdentity: `nov_rep_${this.simpleHash(graph.graphIdentity)}`,
      graphIdentity: graph.graphIdentity,
      observations,
      totalCategoriesObserved: uniqueCategories.size
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
