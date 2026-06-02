import { AuthorizationVector } from './authorization-vector';

export interface VerificationBlueprint {
  /**
   * Deterministic unique ID format: "bp_${vector}_${subjectId}_${resourceFamily}::${concreteParameters}"
   * e.g., "bp_IDOR_usr_13_rest_basket_basketId::1"
   */
  readonly blueprintId: string;

  /**
   * The authorization verification vector.
   */
  readonly vector: AuthorizationVector;

  /**
   * Traceability links (Evidence Preservation)
   */
  readonly authorizationPairId: string; // The origin AuthorizationPair ID
  readonly replayCandidateId: string;    // The origin ReplayCandidate ID
  readonly baselineExchangeId: string;   // The baseline CanonicalHttpExchange template ID
  readonly subjectId: string;            // Attacking non-owning subject (e.g. "usr_13")
  readonly ownerId: string;              // Reconciled owner ID (e.g. "usr_12")
  readonly resourceInstanceKey: string;  // Resource instance unique key (e.g. "/rest/basket/:basketId::1")
  
  /**
   * Target resource mappings
   */
  readonly targetResourceFamily: string; // e.g. "/rest/basket/:basketId"
  readonly targetResourceId: string;     // e.g. "1" (the concrete parameter value)
  readonly authorizationSurface: string; // e.g. "Basket Surface"

  /**
   * Mutation targets (derived from ReplayCandidate)
   */
  readonly mutationTargets: readonly string[]; // Query/Path parameter names slated for replacement
  readonly headerTargets: readonly string[];   // Authentication/Credential headers slated for rotation
}

export interface VerificationBlueprintInventory {
  /**
   * Flat array of verification blueprints, sorted alphabetically by blueprintId.
   */
  readonly blueprints: readonly VerificationBlueprint[];

  /**
   * Indexed lookup grouped by verification vectors.
   */
  readonly blueprintsByVector: Readonly<Record<AuthorizationVector, readonly VerificationBlueprint[]>>;

  /**
   * Indexed lookup grouped by targeted attacking subjects.
   */
  readonly blueprintsBySubject: Readonly<Record<string, readonly VerificationBlueprint[]>>;
}
