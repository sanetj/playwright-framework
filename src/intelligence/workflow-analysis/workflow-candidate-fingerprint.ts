import { WorkflowCandidateMetadata } from './workflow-candidate-enrichment';

/**
 * WorkflowCandidateFingerprint
 * Deterministically generates fingerprint strings from Candidate metadata.
 */
export class WorkflowCandidateFingerprint {
  /**
   * Generates a deterministic, sorted fingerprint string.
   *
   * @param metadata Candidate metadata package
   * @returns Concatenated deterministic fingerprint
   */
  public static build(metadata: WorkflowCandidateMetadata): string {
    const sortedRules = [...metadata.ruleIds].sort();
    const sortedLinks = [...metadata.evidenceLinks].sort();

    return `wf_fp[rules:${sortedRules.join(',')}|links:${sortedLinks.join(',')}]`;
  }
}
