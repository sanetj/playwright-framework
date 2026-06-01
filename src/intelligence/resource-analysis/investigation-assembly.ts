import { AuthorizationVector } from './replay-candidate';

export interface InvestigationAssembly {
  /**
   * Deterministic unique ID format: "asm_${vector}_${subjectId}_${resourceFamily}::${concreteParameters}"
   * e.g., "asm_IDOR_usr_13_rest_basket_basketId::1"
   */
  readonly assemblyId: string;

  /**
   * The authorization verification vector.
   */
  readonly vector: AuthorizationVector;

  /**
   * Reconciled Identity References (Canonical References Only)
   */
  readonly subjectId: string;            // Reference to IdentityProfile.resolvedId (Attacker)
  readonly ownerId: string;              // Reference to IdentityProfile.resolvedId (True Owner)

  /**
   * Target Resource Mappings
   */
  readonly resourceInstanceKey: string;  // Resource instance unique key (e.g. "/rest/basket/:basketId::1")
  readonly targetResourceFamily: string; // e.g. "/rest/basket/:basketId"
  readonly targetResourceId: string;     // e.g. "1" (the concrete parameter value)
  readonly authorizationSurface: string; // e.g. "Basket Surface"

  /**
   * Pipeline Traceability References (Canonical References Only)
   */
  readonly authorizationPairId: string; // Reference to AuthorizationPair.pairId
  readonly replayCandidateId: string;    // Reference to ReplayCandidate.candidateId
  readonly blueprintId: string;          // Reference to VerificationBlueprint.blueprintId
  readonly baselineExchangeId: string;   // Reference to source CanonicalHttpExchange ID
}

export interface InvestigationAssemblyInventory {
  /**
   * Flat array of assemblies, sorted alphabetically by assemblyId.
   */
  readonly assemblies: readonly InvestigationAssembly[];

  /**
   * Indexed lookup grouped by verification vectors.
   */
  readonly assembliesByVector: Readonly<Record<AuthorizationVector, readonly InvestigationAssembly[]>>;

  /**
   * Indexed lookup grouped by targeted attacking subjects.
   */
  readonly assembliesBySubject: Readonly<Record<string, readonly InvestigationAssembly[]>>;

  /**
   * Indexed lookup grouped by targeted resource instance keys.
   */
  readonly assembliesByResource: Readonly<Record<string, readonly InvestigationAssembly[]>>;
}
