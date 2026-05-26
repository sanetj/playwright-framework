/**
 * WorkflowPathFingerprint
 * Deterministically constructs stable fingerprints for workflow paths.
 */
export class WorkflowPathFingerprint {
  /**
   * Generates a stable, de-duplicated, and lexicographically normalized fingerprint.
   *
   * @param entityIds The sequence of entity IDs in the path
   * @returns Deterministic path fingerprint string
   */
  public build(entityIds: string[]): string {
    const uniqueNormalized = Array.from(new Set(entityIds)).sort();
    return `wf_path:${uniqueNormalized.join(',')}`;
  }
}
