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

    // Extract resource signals dynamically to look up OBJECT_IDENTIFIER_PRESENT
    const signalsInventory = this.extractor.extractInventory(exchanges);
    const familySignalsMap = new Map<string, string[]>();
    for (const sig of signalsInventory.signals) {
      familySignalsMap.set(sig.resourceFamily, sig.investigationSignals);
    }

    // Tracks which users accessed a specific concrete resource instance (status 200 OK)
    const resourceAccessMap = new Map<string, Set<string>>();
    // Tracks whether all successful accesses to a resource carry authentication
    const resourceAuthInvariantMap = new Map<string, boolean>();

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
      hasOwnershipKeyInPayload: boolean;
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
        try {
          if (ex.request.url.includes('?')) {
            const queryStr = ex.request.url.split('?')[1];
            const params = new URLSearchParams(queryStr);
            const IDENTIFIER_WHITELIST = new Set([
              'id',
              'uuid',
              'report_id',
              'order_id',
              'video_id',
              'vehicle_id',
              'invoice_id',
              'basket_id'
            ]);
            const sortedKeys = Array.from(params.keys()).sort();
            for (const key of sortedKeys) {
              if (IDENTIFIER_WHITELIST.has(key.toLowerCase())) {
                const val = params.get(key);
                if (val) {
                  concreteId = val;
                  break;
                }
              }
            }
          }
        } catch {
          // Ignored
        }
      }

      if (!concreteId) {
        const familyLower = family.toLowerCase();
        const familySegments = familyLower.split('/').filter(s => s.length > 0);
        const isSelfService = familySegments.some(segment =>
          segment === 'authentication-details' ||
          segment === 'profile' ||
          segment === 'me' ||
          segment === 'account' ||
          segment === 'whoami' ||
          segment === 'authentication'
        );
        if (isSelfService) {
          concreteId = 'self';
        } else {
          continue;
        }
      }

      const resourceKey = `${family}::${concreteId}`;

      // Register access and check authentication invariant in the exclusive access map if response is successful
      if (ex.response && ex.response.status >= 200 && ex.response.status < 300) {
        if (!resourceAccessMap.has(resourceKey)) {
          resourceAccessMap.set(resourceKey, new Set<string>());
        }
        resourceAccessMap.get(resourceKey)!.add(profile.resolvedId);

        const isAuth = this.isExchangeAuthenticated(ex);
        if (!resourceAuthInvariantMap.has(resourceKey)) {
          resourceAuthInvariantMap.set(resourceKey, isAuth);
        } else {
          if (!isAuth) {
            resourceAuthInvariantMap.set(resourceKey, false);
          }
        }
      }

      // Check for explicit payload ownership indicators
      let explicitOwnerConfirmed = false;
      let hasOwnershipKeyInPayload = false;

      const resOwnership = this.extractOwnershipValues(ex.response?.bodyStr);
      const reqOwnership = this.extractOwnershipValues(ex.request?.bodyStr);

      const allOwnershipKeys = new Set([...resOwnership.keys, ...reqOwnership.keys]);
      const allOwnershipValues = [...resOwnership.values, ...reqOwnership.values];

      if (allOwnershipKeys.size > 0) {
        hasOwnershipKeyInPayload = true;
      }

      for (const val of allOwnershipValues) {
        const isMatch =
          val === profile.email ||
          val === profile.username ||
          val === profile.accountId ||
          `usr_${val}` === profile.resolvedId ||
          val === profile.resolvedId.replace('usr_', '');
        if (isMatch) {
          explicitOwnerConfirmed = true;
          break;
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
        explicitWorkspaceId,
        hasOwnershipKeyInPayload
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

    const totalAuthExchanges = exchanges.filter(e => this.isExchangeAuthenticated(e)).length;

    for (const cand of candidateObservations) {
      const resourceKey = `${cand.family}::${cand.concreteId}`;
      const accessorSet = resourceAccessMap.get(resourceKey);
      const isExclusive = accessorSet ? accessorSet.size === 1 : false;

      // 1. Determine Relationship Type with strict promotion rules
      let relationship: OwnershipRelationshipType = 'OBSERVED_ACCESS';

      // Self-service endpoint mapping triggers immediate OWNS promotion
      const familyLower = cand.family.toLowerCase();
      const familySegments = familyLower.split('/').filter(s => s.length > 0);
      const isSelfService = familySegments.some(segment =>
        segment === 'authentication-details' ||
        segment === 'profile' ||
        segment === 'me' ||
        segment === 'account' ||
        segment === 'whoami' ||
        segment === 'authentication'
      );

      // Check if user has explicit ownership evidence to avoid greedy promotion of un-reconciled sessions
      const hasOwnershipEvidence = !!(
        cand.profile.email ||
        cand.profile.username ||
        cand.profile.accountId ||
        (cand.profile.resolvedId && !cand.profile.resolvedId.startsWith(`usr_${cand.profile.sessionIds[0]}`))
      );

      // Rule 3: Evidence-driven promotion rules
      const familySignals = familySignalsMap.get(cand.family) || [];
      const hasObjectIdSignal = familySignals.includes('OBJECT_IDENTIFIER_PRESENT');
      const isAuthInvariantMet = totalAuthExchanges === 0 || resourceAuthInvariantMap.get(resourceKey) !== false;
      const hasOwnershipKey =
        cand.hasOwnershipKeyInPayload ||
        this.hasOwnershipKeyInQuery(cand.ex.request.url) ||
        this.hasOwnershipKeyInFamily(cand.family);

      const isPromotable =
        isSelfService ||
        cand.explicitOwnerConfirmed ||
        (isExclusive && hasObjectIdSignal && isAuthInvariantMet && hasOwnershipKey && hasOwnershipEvidence);

      if (isPromotable && cand.ex.response && cand.ex.response.status >= 200 && cand.ex.response.status < 300) {
        relationship = 'OWNS';
      }

      const cleanFamily = cand.family.split('/').filter(s => s.length > 0).map(s => s.replace(/:/g, '')).join('_');

      // Add Subject (User) -> Resource Relationship
      const obsId = `obs_${relationship}_${cand.profile.resolvedId}_${cleanFamily}_${cand.concreteId}`;
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
        const revObsId = `obs_BELONGS_TO_${cleanFamily}_${cand.concreteId}_${cand.profile.resolvedId}`;
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
        const tenantObsId = `obs_SCOPED_TO_${cand.explicitTenantId}_${cleanFamily}_${cand.concreteId}`;
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
        const workspaceObsId = `obs_SCOPED_TO_${cand.explicitWorkspaceId}_${cleanFamily}_${cand.concreteId}`;
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
        let urlPath = ex.request.url;
        try {
          if (ex.request.url.startsWith('http://') || ex.request.url.startsWith('https://')) {
            urlPath = new URL(ex.request.url).pathname;
          }
        } catch {
          // Fallback
        }
        const urlLower = urlPath.toLowerCase();
        const urlSegments = urlLower.split('/').filter(s => s.length > 0);
        const isSelfEndpoint = urlSegments.some(segment =>
          segment === 'whoami' ||
          segment === 'profile' ||
          segment === 'me' ||
          segment === 'account' ||
          segment === 'authentication' ||
          segment === 'authentication-details'
        );

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

  private extractOwnershipValues(bodyStr: string | undefined): { keys: string[], values: string[] } {
    const keys: string[] = [];
    const values: string[] = [];
    if (!bodyStr) return { keys, values };

    try {
      const parsed = JSON.parse(bodyStr);
      const traverse = (obj: any, depth: number) => {
        if (depth > 3 || !obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
          for (const item of obj) {
            traverse(item, depth + 1);
          }
          return;
        }

        const whitelist = new Set([
          'userid', 'owner', 'username', 'email', 'accountid',
          'tenantid', 'workspaceid', 'projectid', 'teamid'
        ]);

        for (const [key, val] of Object.entries(obj)) {
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (whitelist.has(normalizedKey)) {
            keys.push(normalizedKey);
            if (val !== null && val !== undefined && (typeof val === 'string' || typeof val === 'number')) {
              values.push(String(val));
            }
          }
          if (val && typeof val === 'object') {
            traverse(val, depth + 1);
          }
        }
      };

      traverse(parsed, 1);
    } catch {
      // Ignored
    }

    return { keys, values };
  }

  private hasOwnershipKeyInQuery(urlStr: string): boolean {
    try {
      if (urlStr.includes('?')) {
        const queryStr = urlStr.split('?')[1];
        const params = new URLSearchParams(queryStr);
        const whitelist = new Set([
          'userid', 'owner', 'username', 'email', 'accountid',
          'tenantid', 'workspaceid', 'projectid', 'teamid'
        ]);
        for (const key of params.keys()) {
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (whitelist.has(normalizedKey)) {
            return true;
          }
        }
      }
    } catch {
      // Ignored
    }
    return false;
  }

  private isExchangeAuthenticated(ex: CanonicalHttpExchange): boolean {
    if (!ex.request.headers) return false;
    for (const h of ex.request.headers) {
      const name = h.name.toLowerCase();
      if (name === 'authorization' || name === 'cookie') {
        if (h.value && h.value.trim().length > 0) {
          return true;
        }
      }
    }
    return false;
  }

  private hasOwnershipKeyInFamily(family: string): boolean {
    const familyLower = family.toLowerCase();
    const keywords = ['user', 'owner', 'basket', 'cart', 'invoice', 'billing', 'profile', 'account', 'tenant', 'workspace', 'project', 'team'];
    for (const kw of keywords) {
      if (familyLower.includes(kw)) {
        return true;
      }
    }
    return false;
  }
}

