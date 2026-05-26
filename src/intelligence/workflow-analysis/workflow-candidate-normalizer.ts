import { WorkflowCandidateMetadata } from './workflow-candidate-enrichment';

/**
 * WorkflowCandidateNormalizer
 * Deterministically copies, de-duplicates, and lexicographically sorts candidate metadata.
 */
export class WorkflowCandidateNormalizer {
  /**
   * Cleans and normalizes candidate metadata fields.
   *
   * @param metadata Target metadata to normalize
   * @returns Copied, de-duplicated, and sorted metadata package
   */
  public static normalize(metadata: WorkflowCandidateMetadata): WorkflowCandidateMetadata {
    const uniqueRules = Array.from(new Set(metadata.ruleIds)).sort();
    const uniqueLinks = Array.from(new Set(metadata.evidenceLinks)).sort();

    return {
      ruleIds: uniqueRules,
      evidenceLinks: uniqueLinks
    };
  }
}
