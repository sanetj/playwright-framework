import { createHash } from 'crypto';

/**
 * Ensures IDs are workspace-local and semantically stable.
 * Prevents cross-investigation contamination.
 */
export class SemanticIdentityManager {
  private workspaceId: string;
  private rawToSemantic: Map<string, string> = new Map();
  private semanticToRaw: Map<string, string> = new Map();

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  /**
   * Generates a workspace-local canonical identity.
   */
  public generateIdentity(entityType: string, rawId: string, roleContext: string): string {
    const existing = this.rawToSemantic.get(rawId);
    if (existing) {
      return existing;
    }

    // Hash the combination to ensure stability across replays of the same workspace
    const hash = createHash('sha256')
      .update(`${this.workspaceId}:${entityType}:${rawId}:${roleContext}`)
      .digest('hex')
      .substring(0, 8);

    const semanticId = `${entityType}_${roleContext}_${hash}`;
    
    this.rawToSemantic.set(rawId, semanticId);
    this.semanticToRaw.set(semanticId, rawId);

    return semanticId;
  }

  public getSemanticId(rawId: string): string | undefined {
    return this.rawToSemantic.get(rawId);
  }

  public getRawId(semanticId: string): string | undefined {
    return this.semanticToRaw.get(semanticId);
  }

  public resetMappingsForResume() {
    // When resuming from a checkpoint, the raw IDs from the target may have changed.
    // The replay lineage will re-generate them, and we map them back to the same semantic structures.
    this.rawToSemantic.clear();
    this.semanticToRaw.clear();
  }
}
