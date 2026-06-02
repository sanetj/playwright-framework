import { AuthorizationVector } from './authorization-vector';

export interface AuthorizationPair {
  /**
   * Deterministic, human-readable unique ID format:
   * "pr_${vector}_${subjectId}_${resourceFamily}::${orderedConcreteParameters}"
   * e.g., "pr_IDOR_usr_13_rest_basket_basketId::1"
   */
  readonly pairId: string;

  /**
   * The authorization verification vector.
   */
  readonly vector: AuthorizationVector;

  /**
   * The canonical subject target being paired (the non-owner attacking role/profile).
   */
  readonly subjectId: string;
  readonly subjectType: 'USER' | 'TENANT' | 'WORKSPACE';

  /**
   * Target resource instance identity mapping.
   */
  readonly resourceInstanceKey: string; // Format: "${resourceFamily}::${concreteParameters}"
  readonly targetResourceFamily: string; // e.g. "/rest/basket/:basketId"
  readonly targetResourceId: string;     // e.g. "1" (the concrete parameter value)

  /**
   * References to template metadata.
   */
  readonly baselineExchangeId: string;   // Reference to the baseline CanonicalHttpExchange
  readonly replayCandidateId: string;    // Reference to the synthesized ReplayCandidate ID

  /**
   * Inferred ownership boundaries for assertion validation.
   */
  readonly ownerId: string;              // The canonical ID of the true owner (e.g. "usr_12")
  readonly targetSurface: string;        // e.g. "Basket Surface"
}

export interface AuthorizationPairInventory {
  /**
   * Flat list of authorization pairs, sorted alphabetically by pairId.
   */
  readonly pairs: readonly AuthorizationPair[];

  /**
   * Indexed lookup grouped by verification vectors.
   */
  readonly pairsByVector: Readonly<Record<AuthorizationVector, readonly AuthorizationPair[]>>;

  /**
   * Grouped index mapped by the subject (attacking) resolved IDs.
   */
  readonly pairsBySubject: Readonly<Record<string, readonly AuthorizationPair[]>>;

  /**
   * Grouped index mapped by resource instance identity keys.
   */
  readonly pairsByResource: Readonly<Record<string, readonly AuthorizationPair[]>>;
}
