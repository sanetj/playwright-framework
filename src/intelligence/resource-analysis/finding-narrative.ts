import { AuthorizationVector } from './authorization-vector';

export interface NarrativeFragment {
  readonly key: string;          // e.g. "SUBJECT_IDENTITY" | "OWNER_IDENTITY" | "ATTEMPTED_ACTION"
  readonly value: string;        // e.g. "usr_13", "usr_12", "GET"
  readonly description: string;  // Static, hardcoded description for machine parsing
}

export interface FindingNarrative {
  /**
   * Deterministic unique ID format: "nar_${findingCandidateId}"
   * e.g., "nar_fc_IDOR_rest_basket_basketId_basket_surface"
   */
  readonly narrativeId: string;

  /**
   * Downstream references (Traceability)
   */
  readonly candidateId: string;
  readonly assemblyId: string;  // Direct shortcut to canonical assembly

  readonly vector: AuthorizationVector;
  readonly targetResourceFamily: string;
  readonly authorizationSurface: string;

  /**
   * Core structured logical security facts (no technical IDs/shortcuts)
   */
  readonly facts: {
    readonly subjectId: string;
    readonly ownerId: string;
    readonly httpMethod: string;
  };

  /**
   * Alphabetically sorted key-value fragments for machine parsing
   */
  readonly fragments: readonly NarrativeFragment[];
}

export interface FindingNarrativeInventory {
  /**
   * Flat list of narratives, sorted alphabetically by narrativeId.
   */
  readonly narratives: readonly FindingNarrative[];

  /**
   * Grouped index by AuthorizationVector.
   */
  readonly narrativesByVector: Readonly<Record<AuthorizationVector, readonly FindingNarrative[]>>;
}
