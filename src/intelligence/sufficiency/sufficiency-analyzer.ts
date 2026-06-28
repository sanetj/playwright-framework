import { InvestigationAttackGraph } from '../graphs/attack-graph-contracts';
import { ConsistencyReport } from '../consistency/consistency-contracts';
import { PrioritizedCandidate } from '../scoring/candidate-scoring-contracts';
import { EvidenceSufficiencyReport, SufficiencyObservation, SufficiencyStatus } from './sufficiency-contracts';

/**
 * @architecture_authority Evidence Sufficiency Analyzer
 * @responsibility Evaluates topological and referential completeness of the intelligence payload.
 * @determinism Purely mathematical evaluation of array structures without predictive logic.
 */
export class SufficiencyAnalyzer {

  public analyze(
    investigationId: string,
    candidates: PrioritizedCandidate[],
    graphs: InvestigationAttackGraph[],
    consistencyReports: ConsistencyReport[]
  ): EvidenceSufficiencyReport {
    
    const observations: SufficiencyObservation[] = [];
    let overallStatus: SufficiencyStatus = 'SUFFICIENT';

    // Helper to conditionally downgrade status
    const downgradeTo = (newStatus: SufficiencyStatus) => {
      if (newStatus === 'INSUFFICIENT') overallStatus = 'INSUFFICIENT';
      if (newStatus === 'PARTIALLY_SUPPORTED' && overallStatus !== 'INSUFFICIENT') {
        overallStatus = 'PARTIALLY_SUPPORTED';
      }
    };

    // Rule 1: CANDIDATE_EVIDENCE_COVERAGE
    // Verify that all prioritized candidates contain verifiable structural references.
    let fullySupportedCandidates = 0;
    for (const cand of candidates) {
      if (cand.evidenceExchangeIds.length > 0 && cand.validatedFindingIds.length > 0) {
        fullySupportedCandidates++;
      }
    }
    
    if (candidates.length === 0) {
      observations.push(this.createObservation('obs_cand_empty', 'EVIDENCE_COVERAGE', 'INSUFFICIENT', [], 'The investigation produced absolutely zero candidates. Structural completeness is strictly impossible.'));
      downgradeTo('INSUFFICIENT');
    } else if (fullySupportedCandidates === candidates.length) {
      observations.push(this.createObservation('obs_cand_full', 'EVIDENCE_COVERAGE', 'SUFFICIENT', candidates.map(c => c.candidateIdentity), `All ${candidates.length} candidates possess strict Replay Exchange and Validation Proof arrays.`));
    } else {
      observations.push(this.createObservation('obs_cand_partial', 'EVIDENCE_COVERAGE', 'INSUFFICIENT', [], `Only ${fullySupportedCandidates} of ${candidates.length} candidates contain strict Replay Exchange and Validation Proof arrays. Evidence is structurally malformed.`));
      downgradeTo('INSUFFICIENT');
    }

    // Rule 2: GRAPH_CONSISTENCY_COVERAGE
    // Check if the graph structurally contradicts itself. If so, it requires disambiguation (PARTIALLY_SUPPORTED).
    for (const report of consistencyReports) {
      if (report.contradictions.length > 0) {
        observations.push(this.createObservation(
          `obs_cons_${report.graphIdentity}`,
          'CONSISTENCY_COVERAGE',
          'PARTIALLY_SUPPORTED',
          [report.graphIdentity],
          `The Attack Graph contains ${report.contradictions.length} logical contradiction(s). While structurally valid, the graph narrative requires manual disambiguation.`
        ));
        downgradeTo('PARTIALLY_SUPPORTED');
      } else {
        observations.push(this.createObservation(
          `obs_cons_clean_${report.graphIdentity}`,
          'CONSISTENCY_COVERAGE',
          'SUFFICIENT',
          [report.graphIdentity],
          'The Attack Graph is perfectly logically consistent.'
        ));
      }
    }

    // Rule 3: OWNERSHIP_EVIDENCE_COVERAGE
    // Investigations missing ownership logic are structurally weaker.
    const candidatesWithOwnership = candidates.filter(c => c.ownershipReferences.length > 0).length;
    if (candidates.length > 0 && candidatesWithOwnership === 0) {
      observations.push(this.createObservation('obs_own_none', 'OWNERSHIP_COMPLETENESS', 'PARTIALLY_SUPPORTED', [], 'Zero candidates reference ownership bounds. The investigation lacks authorization context, limiting structural mass.'));
      downgradeTo('PARTIALLY_SUPPORTED');
    } else if (candidatesWithOwnership > 0) {
      observations.push(this.createObservation('obs_own_some', 'OWNERSHIP_COMPLETENESS', 'SUFFICIENT', [], `${candidatesWithOwnership} candidates explicitly reference deterministic ownership bounds.`));
    }

    // Deterministic sorting
    observations.sort((a, b) => a.observationIdentity.localeCompare(b.observationIdentity));

    const idMat = `suff_rep_${investigationId}_${overallStatus}`;

    return {
      reportIdentity: `suff_${this.simpleHash(idMat)}`,
      investigationId,
      overallStatus,
      observations
    };
  }

  private createObservation(idSeed: string, category: any, status: SufficiencyStatus, references: string[], rationale: string): SufficiencyObservation {
    return {
      observationIdentity: `obs_${this.simpleHash(idSeed)}`,
      category,
      status,
      supportingReferences: references.slice().sort(),
      rationale
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
