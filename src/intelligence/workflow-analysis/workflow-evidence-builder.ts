/**
 * WorkflowEvidenceBuilder
 * Decouples rule ID formatting from the candidate generation layer,
 * producing deterministic evidence strings.
 */
export class WorkflowEvidenceBuilder {
  /**
   * Translates triggered rule IDs into standardized evidence link strings.
   *
   * @param ruleIds Array of triggered workflow rule IDs
   * @returns Array of formatted evidence link strings
   */
  public static buildEvidenceLinks(ruleIds: string[]): string[] {
    return ruleIds.map(id => `workflow-rule:${id}`);
  }
}
