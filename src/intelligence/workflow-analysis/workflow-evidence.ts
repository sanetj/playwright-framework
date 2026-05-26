export interface WorkflowEvidence {
  pathId: string;
  entityIds: string[];
  boundaryIds: string[];
  riskSignals: string[];
  sourceNodeIds: string[];
}

/**
 * WorkflowEvidenceBuilder
 * Aggregates workflow path, classification boundary, risk signal, and source node references
 * into a single, cohesive evidence package.
 */
export class WorkflowEvidenceBuilder {
  /**
   * Constructs a WorkflowEvidence package by preserving array ordering.
   *
   * @param pathId Active workflow path identifier
   * @param entityIds Traversed entity IDs
   * @param boundaryIds Boundary identifiers crossed
   * @param riskSignals Triggered risk signals/rules
   * @param sourceNodeIds Core action graph nodes mapped
   * @returns Deterministically aggregated evidence structure
   */
  public build(
    pathId: string,
    entityIds: string[],
    boundaryIds: string[],
    riskSignals: string[],
    sourceNodeIds: string[]
  ): WorkflowEvidence {
    return {
      pathId,
      entityIds: [...entityIds],
      boundaryIds: [...boundaryIds],
      riskSignals: [...riskSignals],
      sourceNodeIds: [...sourceNodeIds]
    };
  }
}
