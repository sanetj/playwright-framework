/**
 * @canonical
 * Phase 10.2 Ownership Intelligence Contracts
 * Timeless, deterministic types mapping resource instances back to resolved identities and owners.
 */

export interface IdentityProfile {
  readonly resolvedId: string; // Unified canonical user identifier (e.g., "usr_12")
  readonly email?: string;
  readonly username?: string;
  readonly accountId?: string;
  readonly sessionIds: string[]; // List of session IDs bound to this profile
}

export type OwnershipRelationshipType =
  | 'OBSERVED_ACCESS' // General access (User -> Resource)
  | 'OWNS'            // Direct resource owner (User -> Resource)
  | 'MEMBER_OF'       // Collaborative workspace membership (User -> Workspace)
  | 'ADMIN_OF'        // Elevated administrative scoping (User -> Tenant/Workspace)
  | 'BELONGS_TO'      // Reverse ownership binding (Resource -> User)
  | 'SCOPED_TO';      // Partition scoping (Resource -> Tenant/Workspace)

export interface OwnershipObservation {
  /**
   * Deterministic unique ID format: "obs_${relationship}_${subjectId}_${targetResourceId}"
   * e.g., "obs_OWNS_usr_12_basket_1"
   * @invariant ID-STABILITY: Every execution over the same subject + resource yields identical IDs.
   */
  readonly observationId: string;

  readonly subjectId: string; // e.g. "usr_12" or "t-a"
  readonly subjectType: 'USER' | 'TENANT' | 'WORKSPACE';
  readonly relationship: OwnershipRelationshipType;
  readonly targetResourceFamily: string; // e.g., "/rest/basket/:basketId"
  readonly targetResourceId: string;     // The concrete parameter/ID observed (e.g. "1")
  readonly baselineExchangeId: string;   // The source CanonicalHttpExchange ID
}

export interface OwnershipInventory {
  /**
   * Flat list of ownership observations, sorted alphabetically by observationId.
   */
  readonly observations: OwnershipObservation[];

  /**
   * Grouped relationships lookup index mapped by subject resolved IDs.
   */
  readonly relationshipsBySubject: Record<string, OwnershipObservation[]>;

  /**
   * Grouped index mapping resource identities ("${resourceFamily}::${concreteId}") to their inferred owner resolved IDs.
   */
  readonly resourceOwners: Record<string, string[]>;

  /**
   * Unified identity profiles resolved from passive self-service scans.
   */
  readonly profiles: readonly IdentityProfile[];
}

/**
 * Passive utility to identify if a subject profile ID represents an unresolved session fallback.
 */
export function isUnresolvedIdentity(profileId: string): boolean {
  return profileId.startsWith('usr_sess_') || profileId.startsWith('usr_session_');
}

