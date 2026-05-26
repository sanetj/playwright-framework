import { WorkflowRiskSignals } from '../workflow-models/workflow-risk-signals';
import { WorkflowEvidenceBuilder } from './workflow-evidence-builder';

export interface WorkflowCandidateMetadata {
  ruleIds: string[];
  evidenceLinks: string[];
}

/**
 * WorkflowCandidateEnricher
 * Deterministically enriches candidate metadata from workflow risk signals and existing evidence links.
 */
export class WorkflowCandidateEnricher {
  /**
   * Passive transformation to map signals and base links to Candidate metadata.
   *
   * @param signals The analyzed workflow risk signals
   * @param baseEvidenceLinks Existing raw/base evidence links
   * @returns Deterministic metadata package
   */
  public static enrich(
    signals: WorkflowRiskSignals,
    baseEvidenceLinks: string[]
  ): WorkflowCandidateMetadata {
    const ruleIds = signals.triggeredRuleIds ?? [];
    const ruleEvidence = WorkflowEvidenceBuilder.buildEvidenceLinks(ruleIds);

    return {
      ruleIds,
      evidenceLinks: [...baseEvidenceLinks, ...ruleEvidence]
    };
  }
}
