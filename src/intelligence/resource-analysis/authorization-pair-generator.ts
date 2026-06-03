import { IdentityProfile, OwnershipInventory, isUnresolvedIdentity } from './ownership-intelligence';
import { ReplayCandidateInventory, ReplayCandidate } from './replay-candidate';
import { AuthorizationPair, AuthorizationPairInventory } from './authorization-pairing';
import { AuthorizationVector } from './authorization-vector';
import { sanitizeResourceFamily } from './resource-analysis-utils';

export class AuthorizationPairGenerator {
  /**
   * Ownership-driven generation mapping ownership boundaries and replay candidates
   * to a stable, deterministic AuthorizationPairInventory.
   */
  public generatePairs(
    candidatesInventory: ReplayCandidateInventory,
    ownershipInventory: OwnershipInventory
  ): AuthorizationPairInventory {
    const profiles = ownershipInventory.profiles;
    const pairsMap = new Map<string, AuthorizationPair>();

    // Fast lookup index: ReplayCandidates grouped by target resourceFamily
    const candidatesByFamily = new Map<string, ReplayCandidate[]>();
    for (const cand of candidatesInventory.candidates) {
      if (!candidatesByFamily.has(cand.resourceFamily)) {
        candidatesByFamily.set(cand.resourceFamily, []);
      }
      candidatesByFamily.get(cand.resourceFamily)!.push(cand);
    }

    // Fast lookup index: IdentityProfile grouped by resolvedId
    const profilesById = new Map<string, IdentityProfile>();
    for (const p of profiles) {
      profilesById.set(p.resolvedId, p);
    }

    // Iterate over each resource instance that has ownership evidence
    for (const resourceKey of Object.keys(ownershipInventory.resourceOwners)) {
      const delimiterIndex = resourceKey.indexOf('::');
      if (delimiterIndex === -1) continue;

      const resourceFamily = resourceKey.slice(0, delimiterIndex);
      const concreteId = resourceKey.slice(delimiterIndex + 2);

      const ownerIds = ownershipInventory.resourceOwners[resourceKey] || [];
      const isParameterized = resourceFamily.includes(':');
      if (!isParameterized || ownerIds.length !== 1 || concreteId === 'self' || concreteId === 'me') {
        // Exclusion: Non-pairable resource structures (unparameterized, multiple owners, or static context selectors)
        continue;
      }
      const resourceTenants = this.getResourceTenants(resourceFamily, concreteId, ownershipInventory);

      for (const ownerId of ownerIds) {
        const ownerProfile = profilesById.get(ownerId);
        if (!ownerProfile || isUnresolvedIdentity(ownerProfile.resolvedId)) {
          // Exclusion: Owner identity is unresolved (raw session fallback)
          continue;
        }

        // Loop over alternative resolved profiles (attacking actors)
        for (const attackingProfile of profiles) {
          if (attackingProfile.resolvedId === ownerId) {
            // Exclusion: Self-pairing (Owner attacking own resource)
            continue;
          }

          if (isUnresolvedIdentity(attackingProfile.resolvedId)) {
            // Exclusion: Subject identity is unresolved (raw session fallback)
            continue;
          }

          // Fetch replay templates targeting this resource family
          const matchingCandidates = candidatesByFamily.get(resourceFamily) || [];
          for (const candidate of matchingCandidates) {
            // 1. Determine classification vector with dynamic boundary and tenancy rules
            const subjectTenants = this.getUserTenants(attackingProfile.resolvedId, ownershipInventory);

            let vector: AuthorizationVector = 'IDOR';

            const isTenantMismatch =
              resourceTenants.size > 0 &&
              Array.from(resourceTenants).some(t => !subjectTenants.has(t));

            const isPrivilegedSignal = candidate.synthesisReasons.some(
              reason =>
                reason.includes('BOUNDARY_ADJACENT') ||
                reason.includes('PRIVILEGE_TRANSITION_OBSERVED') ||
                reason.includes('EXPORT_CAPABLE') ||
                reason.includes('DOWNLOAD_CAPABLE')
            );

            const isPrivilegedSurface =
              candidate.authorizationSurface === 'Administration Surface' ||
              candidate.authorizationSurface === 'Billing Surface' ||
              candidate.authorizationSurface === 'Export Surface' ||
              candidate.authorizationSurface === 'Report Surface';

            if (isTenantMismatch) {
              vector = 'TENANT_ISOLATION';
            } else if (candidate.targetVector === 'BAC' || isPrivilegedSignal || isPrivilegedSurface) {
              vector = 'BAC';
            } else {
              vector = 'IDOR';
            }

            // 2. Build human-readable deterministic pair ID
            const sanitizedFamily = sanitizeResourceFamily(resourceFamily);
            const pairId = `pr_${vector}_${attackingProfile.resolvedId}_${sanitizedFamily}::${concreteId}`;

            // Invariant: One Authorization Opportunity = One Pair (Duplicate Prevention)
            if (!pairsMap.has(pairId)) {
              pairsMap.set(pairId, {
                pairId,
                vector,
                subjectId: attackingProfile.resolvedId,
                subjectType: 'USER',
                resourceInstanceKey: resourceKey,
                targetResourceFamily: resourceFamily,
                targetResourceId: concreteId,
                baselineExchangeId: candidate.baselineExchangeId,
                replayCandidateId: candidate.candidateId,
                ownerId,
                targetSurface: candidate.authorizationSurface
              });
            }
          }
        }
      }
    }

    // Extract deduplicated pairs
    const pairs = Array.from(pairsMap.values());

    // Stable sort alphabetically by pairId to guarantee 100% determinism
    pairs.sort((a, b) => a.pairId.localeCompare(b.pairId));

    // Group index initialization
    const pairsByVector: Record<AuthorizationVector, AuthorizationPair[]> = {
      IDOR: [],
      BAC: [],
      TENANT_ISOLATION: []
    };

    const pairsBySubject: Record<string, AuthorizationPair[]> = {};
    const pairsByResource: Record<string, AuthorizationPair[]> = {};

    for (const pair of pairs) {
      pairsByVector[pair.vector].push(pair);

      if (!pairsBySubject[pair.subjectId]) {
        pairsBySubject[pair.subjectId] = [];
      }
      pairsBySubject[pair.subjectId].push(pair);

      if (!pairsByResource[pair.resourceInstanceKey]) {
        pairsByResource[pair.resourceInstanceKey] = [];
      }
      pairsByResource[pair.resourceInstanceKey].push(pair);
    }

    // Sort grouped record lists to maintain determinism
    for (const vec of Object.keys(pairsByVector) as AuthorizationVector[]) {
      pairsByVector[vec].sort((a, b) => a.pairId.localeCompare(b.pairId));
    }
    for (const sub of Object.keys(pairsBySubject)) {
      pairsBySubject[sub].sort((a, b) => a.pairId.localeCompare(b.pairId));
    }
    for (const res of Object.keys(pairsByResource)) {
      pairsByResource[res].sort((a, b) => a.pairId.localeCompare(b.pairId));
    }

    // Deep freeze results to satisfy immutability invariants
    return Object.freeze({
      pairs: Object.freeze(pairs),
      pairsByVector: Object.freeze(pairsByVector),
      pairsBySubject: Object.freeze(pairsBySubject),
      pairsByResource: Object.freeze(pairsByResource)
    });
  }



  /**
   * Helper: Retrieve tenant memberships for a resolved subject ID
   */
  private getUserTenants(subjectId: string, ownershipInventory: OwnershipInventory): Set<string> {
    const tenants = new Set<string>();
    const obsList = ownershipInventory.relationshipsBySubject[subjectId] || [];
    for (const obs of obsList) {
      if (obs.relationship === 'MEMBER_OF' && obs.targetResourceFamily === 'TENANT_CONTEXT') {
        tenants.add(obs.targetResourceId);
      }
    }
    return tenants;
  }

  /**
   * Helper: Retrieve tenant scoping for a concrete resource instance
   */
  private getResourceTenants(
    resourceFamily: string,
    concreteId: string,
    ownershipInventory: OwnershipInventory
  ): Set<string> {
    const tenants = new Set<string>();
    for (const obs of ownershipInventory.observations) {
      if (
        obs.relationship === 'SCOPED_TO' &&
        obs.subjectType === 'TENANT' &&
        obs.targetResourceFamily === resourceFamily &&
        obs.targetResourceId === concreteId
      ) {
        tenants.add(obs.subjectId);
      }
    }
    return tenants;
  }
}
