import { CanonicalHttpExchange } from '../../runtime/evidence/canonical-http-evidence';
import { ResourceSignalExtractor } from './resource-signal-extractor';
import {
  IdentityProfile,
  OwnershipObservation,
  OwnershipInventory,
  OwnershipRelationshipType
} from './ownership-intelligence';

export class OwnershipInferencer {
  private readonly extractor = new ResourceSignalExtractor();

  /**
   * Passive inference analyzing CanonicalHttpExchanges to build a stable OwnershipInventory.
   */
  public inferOwnership(exchanges: CanonicalHttpExchange[]): OwnershipInventory {
    // Step 1: Reconcile Identity Profiles deterministically
    const profiles = this.reconcileIdentities(exchanges);
    const sessionToProfile = new Map<string, IdentityProfile>();
    for (const p of profiles) {
      for (const sid of p.sessionIds) {
        sessionToProfile.set(sid, p);
      }
    }

    // Tracks which users accessed a specific concrete resource instance (status 200 OK)
    const resourceAccessMap = new Map<string, Set<string>>();
    // Stores candidate observations and explicit body matching findings
    const candidateObservations: {
      ex: CanonicalHttpExchange;
      profile: IdentityProfile;
      family: string;
      concreteId: string;
      surface: string;
      explicitOwnerConfirmed: boolean;
      explicitTenantId?: string;
      explicitWorkspaceId?: string;
    }[] = [];

    for (const ex of exchanges) {
      const profile = sessionToProfile.get(ex.sessionId);
      if (!profile) continue;

      let urlPath = ex.request.url;
      try {
        if (ex.request.url.startsWith('http://') || ex.request.url.startsWith('https://')) {
          urlPath = new URL(ex.request.url).pathname;
        }
      } catch {
        // Fallback
      }

      const { family, surface } = this.extractor.normalizeUrlToFamily(ex.request.url);
      let concreteId = this.extractConcreteId(urlPath, family);
      if (!concreteId) {
        const isSelfService =
          family.includes('authentication-details') ||
          family.includes('profile') ||
          family.includes('/me') ||
          family.includes('account') ||
          family.includes('whoami') ||
          family.includes('authentication');
        if (isSelfService) {
          concreteId = 'self';
        } else {
          continue;
        }
      }

      const resourceKey = `${family}::${concreteId}`;

      // Register access in the exclusive access map if response is successful
      if (ex.response && ex.response.status >= 200 && ex.response.status < 300) {
        if (!resourceAccessMap.has(resourceKey)) {
          resourceAccessMap.set(resourceKey, new Set<string>());
        }
        resourceAccessMap.get(resourceKey)!.add(profile.resolvedId);
      }

      // Check for explicit payload ownership indicators
      let explicitOwnerConfirmed = false;
      if (ex.response && ex.response.bodyStr) {
        try {
          const parsed = JSON.parse(ex.response.bodyStr);
          if (parsed && typeof parsed === 'object') {
            const ownerVal = parsed.owner || parsed.userId || parsed.username || parsed.email;
            if (ownerVal !== undefined) {
              const strVal = String(ownerVal);
              const isMatch =
                strVal === profile.email ||
                strVal === profile.username ||
                strVal === profile.accountId ||
                `usr_${strVal}` === profile.resolvedId ||
                strVal === profile.resolvedId.replace('usr_', '');
              if (isMatch) {
                explicitOwnerConfirmed = true;
              }
            }
          }
        } catch {
          // Non-JSON response ignored
        }
      }

      // Check for explicit tenant/workspace scoping parameters
      let explicitTenantId: string | undefined;
      let explicitWorkspaceId: string | undefined;

      // Scan request headers for tenancy indicators
      for (const h of ex.request.headers) {
        const name = h.name.toLowerCase();
        if (name === 'x-tenant-id' || name === 'tenant-id' || name === 'x-tenant') {
          explicitTenantId = h.value;
        }
      }

      // Scan query/body parameter signatures
      try {
        if (ex.request.url.includes('?')) {
          const queryStr = ex.request.url.split('?')[1];
          const queryParams = new URLSearchParams(queryStr);
          const tVal = queryParams.get('tenantId') || queryParams.get('tenant');
          if (tVal) explicitTenantId = tVal;
          const wVal = queryParams.get('workspaceId') || queryParams.get('workspace');
          if (wVal) explicitWorkspaceId = wVal;
        }
      } catch {
        // Ignored
      }

      candidateObservations.push({
        ex,
        profile,
        family,
        concreteId,
        surface,
        explicitOwnerConfirmed,
        explicitTenantId,
        explicitWorkspaceId
      });
    }

    const observations: OwnershipObservation[] = [];
    const uniqueObsKeys = new Set<string>();

    const addObservation = (obs: OwnershipObservation) => {
      if (!uniqueObsKeys.has(obs.observationId)) {
        uniqueObsKeys.add(obs.observationId);
        observations.push(obs);
      }
    };

    for (const cand of candidateObservations) {
      const resourceKey = `${cand.family}::${cand.concreteId}`;
      const accessorSet = resourceAccessMap.get(resourceKey);
      const isExclusive = accessorSet ? accessorSet.size === 1 : false;

      // 1. Determine Relationship Type with strict promotion rules
      let relationship: OwnershipRelationshipType = 'OBSERVED_ACCESS';

      // Self-service endpoint mapping triggers immediate OWNS promotion
      const isSelfService =
        cand.family.includes('authentication-details') ||
        cand.family.includes('profile') ||
        cand.family.includes('/me') ||
        cand.family.includes('account') ||
        cand.family.includes('whoami') ||
        cand.family.includes('authentication');

      // Check if resource category is a dynamic user-scoped type
      const isUserScopedResource =
        cand.surface === 'Basket Surface' ||
        cand.surface === 'Invoice Surface' ||
        cand.surface === 'User Surface';

      // Check if user has explicit ownership evidence to avoid greedy promotion of un-reconciled sessions
      const hasOwnershipEvidence = !!(
        cand.profile.email ||
        cand.profile.username ||
        cand.profile.accountId ||
        (cand.profile.resolvedId && !cand.profile.resolvedId.startsWith(`usr_${cand.profile.sessionIds[0]}`))
      );

      const isPromotable =
        isSelfService ||
        cand.explicitOwnerConfirmed ||
        (isExclusive && isUserScopedResource && hasOwnershipEvidence);

      if (isPromotable && cand.ex.response && cand.ex.response.status >= 200 && cand.ex.response.status < 300) {
        relationship = 'OWNS';
      }

      // Add Subject (User) -> Resource Relationship
      const obsId = `obs_${relationship}_${cand.profile.resolvedId}_${cand.concreteId}`;
      addObservation({
        observationId: obsId,
        subjectId: cand.profile.resolvedId,
        subjectType: 'USER',
        relationship,
        targetResourceFamily: cand.family,
        targetResourceId: cand.concreteId,
        baselineExchangeId: cand.ex.exchangeId.id
      });

      // Add Reverse Resource -> User Relationship (BELONGS_TO) if ownership is verified
      if (relationship === 'OWNS') {
        const revObsId = `obs_BELONGS_TO_${cand.concreteId}_${cand.profile.resolvedId}`;
        addObservation({
          observationId: revObsId,
          subjectId: cand.profile.resolvedId,
          subjectType: 'USER',
          relationship: 'BELONGS_TO',
          targetResourceFamily: cand.family,
          targetResourceId: cand.concreteId,
          baselineExchangeId: cand.ex.exchangeId.id
        });
      }

      // 2. Add Tenant Scoping Relationships (SCOPED_TO) if tenant ID detected
      if (cand.explicitTenantId) {
        const tenantObsId = `obs_SCOPED_TO_${cand.explicitTenantId}_${cand.concreteId}`;
        addObservation({
          observationId: tenantObsId,
          subjectId: cand.explicitTenantId,
          subjectType: 'TENANT',
          relationship: 'SCOPED_TO',
          targetResourceFamily: cand.family,
          targetResourceId: cand.concreteId,
          baselineExchangeId: cand.ex.exchangeId.id
        });

        // Add Session User -> Tenant Membership (MEMBER_OF)
        const memberObsId = `obs_MEMBER_OF_${cand.profile.resolvedId}_${cand.explicitTenantId}`;
        addObservation({
          observationId: memberObsId,
          subjectId: cand.profile.resolvedId,
          subjectType: 'USER',
          relationship: 'MEMBER_OF',
          targetResourceFamily: 'TENANT_CONTEXT',
          targetResourceId: cand.explicitTenantId,
          baselineExchangeId: cand.ex.exchangeId.id
        });
      }

      // 3. Add Workspace Scoping Relationships (SCOPED_TO) if workspace ID detected
      if (cand.explicitWorkspaceId) {
        const workspaceObsId = `obs_SCOPED_TO_${cand.explicitWorkspaceId}_${cand.concreteId}`;
        addObservation({
          observationId: workspaceObsId,
          subjectId: cand.explicitWorkspaceId,
          subjectType: 'WORKSPACE',
          relationship: 'SCOPED_TO',
          targetResourceFamily: cand.family,
          targetResourceId: cand.concreteId,
          baselineExchangeId: cand.ex.exchangeId.id
        });

        // Add Session User -> Workspace Membership (MEMBER_OF)
        const memberObsId = `obs_MEMBER_OF_${cand.profile.resolvedId}_${cand.explicitWorkspaceId}`;
        addObservation({
          observationId: memberObsId,
          subjectId: cand.profile.resolvedId,
          subjectType: 'USER',
          relationship: 'MEMBER_OF',
          targetResourceFamily: 'WORKSPACE_CONTEXT',
          targetResourceId: cand.explicitWorkspaceId,
          baselineExchangeId: cand.ex.exchangeId.id
        });
      }
    }

    // Sort observations alphabetically by observationId to preserve 100% determinism
    observations.sort((a, b) => a.observationId.localeCompare(b.observationId));

    // Group observations by subject
    const relationshipsBySubject: Record<string, OwnershipObservation[]> = {};
    for (const obs of observations) {
      if (!relationshipsBySubject[obs.subjectId]) {
        relationshipsBySubject[obs.subjectId] = [];
      }
      relationshipsBySubject[obs.subjectId].push(obs);
    }

    // Map resource owner IDs (resolving format: "${resourceFamily}::${concreteId}")
    const resourceOwners: Record<string, string[]> = {};
    for (const obs of observations) {
      if (obs.relationship === 'OWNS') {
        const key = `${obs.targetResourceFamily}::${obs.targetResourceId}`;
        if (!resourceOwners[key]) {
          resourceOwners[key] = [];
        }
        if (!resourceOwners[key].includes(obs.subjectId)) {
          resourceOwners[key].push(obs.subjectId);
        }
      }
    }

    // Stable sort grouped records
    for (const sub of Object.keys(relationshipsBySubject)) {
      relationshipsBySubject[sub].sort((a, b) => a.observationId.localeCompare(b.observationId));
    }
    for (const resKey of Object.keys(resourceOwners)) {
      resourceOwners[resKey].sort();
    }

    return {
      observations,
      relationshipsBySubject,
      resourceOwners,
      profiles
    };

  }

  /**
   * Deterministically extract dynamic route path parameters from a pathname based on resource family template.
   */
  private extractConcreteId(pathname: string, family: string): string | null {
    const pathSegments = pathname.split('/').filter(s => s.length > 0);
    const familySegments = family.split('/').filter(s => s.length > 0);
    if (pathSegments.length !== familySegments.length) return null;

    for (let i = 0; i < familySegments.length; i++) {
      if (familySegments[i].startsWith(':')) {
        return pathSegments[i];
      }
    }
    return null;
  }

  /**
   * Passive identity profile reconciliation matching session cookies/IDs to resolved profiles.
   */
  private reconcileIdentities(exchanges: CanonicalHttpExchange[]): IdentityProfile[] {
    const sessionToInfo = new Map<string, {
      userId?: string;
      email?: string;
      username?: string;
      accountId?: string;
    }>();

    for (const ex of exchanges) {
      const sid = ex.sessionId;
      if (!sessionToInfo.has(sid)) {
        sessionToInfo.set(sid, {});
      }

      const info = sessionToInfo.get(sid)!;

      // Extract explicit profile fields from self-service responses
      if (ex.response && ex.response.bodyStr) {
        const urlLower = ex.request.url.toLowerCase();
        const isSelfEndpoint =
          urlLower.includes('whoami') ||
          urlLower.includes('profile') ||
          urlLower.includes('/me') ||
          urlLower.includes('account') ||
          urlLower.includes('authentication');

        if (isSelfEndpoint) {
          try {
            const parsed = JSON.parse(ex.response.bodyStr);
            if (parsed && typeof parsed === 'object') {
              const data = parsed.data || parsed;
              if (data.id) info.userId = String(data.id);
              if (data.userId) info.userId = String(data.userId);
              if (data.email) info.email = String(data.email);
              if (data.username) info.username = String(data.username);
              if (data.accountId) info.accountId = String(data.accountId);
            }
          } catch {
            // Ignored
          }
        }
      }
    }

    const resolvedProfilesMap = new Map<string, {
      resolvedId: string;
      email?: string;
      username?: string;
      accountId?: string;
      sessionIds: Set<string>;
    }>();

    for (const [sid, info] of sessionToInfo.entries()) {
      const resolvedId = info.userId ? `usr_${info.userId}` : `usr_${sid}`;
      const existing = resolvedProfilesMap.get(resolvedId);
      if (existing) {
        if (info.email) existing.email = info.email;
        if (info.username) existing.username = info.username;
        if (info.accountId) existing.accountId = info.accountId;
        existing.sessionIds.add(sid);
      } else {
        resolvedProfilesMap.set(resolvedId, {
          resolvedId,
          email: info.email,
          username: info.username,
          accountId: info.accountId,
          sessionIds: new Set<string>([sid])
        });
      }
    }

    const resolvedProfiles: IdentityProfile[] = Array.from(resolvedProfilesMap.values()).map(p => ({
      resolvedId: p.resolvedId,
      email: p.email,
      username: p.username,
      accountId: p.accountId,
      sessionIds: Array.from(p.sessionIds).sort()
    }));

    // Sort profiles alphabetically by resolvedId to guarantee determinism
    resolvedProfiles.sort((a, b) => a.resolvedId.localeCompare(b.resolvedId));

    return resolvedProfiles;
  }
}
