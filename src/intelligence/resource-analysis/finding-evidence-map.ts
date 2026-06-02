import { AuthorizationVector } from './authorization-vector';

export interface EvidenceReference {
  /**
   * Fully normalized reference. The downstream consumer queries the canonical assembly
   * using assemblyId to resolve blueprintId, replayCandidateId, and baselineExchangeId.
   */
  readonly assemblyId: string;
}

export interface FindingEvidenceMap {
  /**
   * Deterministic unique ID format: "evmap_${narrativeId}"
   * e.g., "evmap_nar_fc_IDOR_rest_basket_basketId_basket_surface"
   */
  readonly evidenceMapId: string;

  /**
   * Downstream references (Traceability metadata)
   */
  readonly narrativeId: string;
  readonly candidateId: string;

  readonly vector: AuthorizationVector;
  readonly targetResourceFamily: string;
  readonly authorizationSurface: string;

  /**
   * Normalized Traceability Reference
   */
  readonly evidence: EvidenceReference;
}

export interface EvidenceMapInventory {
  /**
   * Flat array of evidence maps, sorted alphabetically by evidenceMapId.
   */
  readonly maps: readonly FindingEvidenceMap[];

  /**
   * Grouped index by AuthorizationVector.
   */
  readonly mapsByVector: Readonly<Record<AuthorizationVector, readonly FindingEvidenceMap[]>>;
}
