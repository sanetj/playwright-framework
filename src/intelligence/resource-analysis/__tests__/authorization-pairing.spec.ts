import { test, expect } from '@playwright/test';
import { AuthorizationPairGenerator } from '../authorization-pair-generator';
import { IdentityProfile, OwnershipInventory, OwnershipObservation } from '../ownership-intelligence';
import { ReplayCandidateInventory, ReplayCandidate } from '../replay-candidate';

function createMockCandidate(data: {
  id: string;
  family: string;
  method?: ReplayCandidate['httpMethod'];
  surface?: string;
  vector?: 'IDOR' | 'BAC' | 'TENANT_ISOLATION';
  reasons?: string[];
}): ReplayCandidate {
  return {
    candidateId: data.id,
    resourceFamily: data.family,
    httpMethod: data.method || 'GET',
    authorizationSurface: data.surface || 'General Surface',
    targetVector: data.vector || 'IDOR',
    baselineExchangeId: `ex_base_${data.id}`,
    parameterTargets: [],
    headerTargets: [],
    synthesisReasons: data.reasons || ['OBJECT_IDENTIFIER_PRESENT']
  };
}

function createMockObservation(data: {
  id: string;
  subject: string;
  subjectType?: 'USER' | 'TENANT' | 'WORKSPACE';
  relationship: 'OBSERVED_ACCESS' | 'OWNS' | 'MEMBER_OF' | 'ADMIN_OF' | 'BELONGS_TO' | 'SCOPED_TO';
  family: string;
  concreteId: string;
}): OwnershipObservation {
  return {
    observationId: data.id,
    subjectId: data.subject,
    subjectType: data.subjectType || 'USER',
    relationship: data.relationship,
    targetResourceFamily: data.family,
    targetResourceId: data.concreteId,
    baselineExchangeId: 'ex_test'
  };
}

test.describe('Phase 10.3 — Authorization Pairing Intelligence Unit Tests', () => {
  let generator: AuthorizationPairGenerator;

  test.beforeEach(() => {
    generator = new AuthorizationPairGenerator();
  });

  test('1. Ownership-driven pair generation matches non-owners to owned resources', () => {
    const profiles: IdentityProfile[] = [
      { resolvedId: 'usr_12', email: 'owner@test.com', sessionIds: ['sess_owner'] },
      { resolvedId: 'usr_13', email: 'other@test.com', sessionIds: ['sess_other'] }
    ];

    const candidates: ReplayCandidateInventory = {
      candidates: [createMockCandidate({ id: 'cand1', family: '/rest/basket/:basketId' })],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const observations: OwnershipObservation[] = [
      createMockObservation({
        id: 'obs1',
        subject: 'usr_12',
        relationship: 'OWNS',
        family: '/rest/basket/:basketId',
        concreteId: '1'
      })
    ];

    const ownership: OwnershipInventory = {
      observations,
      relationshipsBySubject: { usr_12: observations },
      resourceOwners: { '/rest/basket/:basketId::1': ['usr_12'] }
    };

    const result = generator.generatePairs(profiles, candidates, ownership);

    expect(result.pairs.length).toBe(1);
    const pair = result.pairs[0];
    expect(pair.subjectId).toBe('usr_13');
    expect(pair.ownerId).toBe('usr_12');
    expect(pair.targetResourceId).toBe('1');
    expect(pair.vector).toBe('IDOR');
  });

  test('2. Self-pair exclusion: Owners are never paired with their own resources', () => {
    const profiles: IdentityProfile[] = [
      { resolvedId: 'usr_12', email: 'owner@test.com', sessionIds: ['sess_owner'] }
    ];

    const candidates: ReplayCandidateInventory = {
      candidates: [createMockCandidate({ id: 'cand1', family: '/rest/basket/:basketId' })],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const observations: OwnershipObservation[] = [
      createMockObservation({
        id: 'obs1',
        subject: 'usr_12',
        relationship: 'OWNS',
        family: '/rest/basket/:basketId',
        concreteId: '1'
      })
    ];

    const ownership: OwnershipInventory = {
      observations,
      relationshipsBySubject: { usr_12: observations },
      resourceOwners: { '/rest/basket/:basketId::1': ['usr_12'] }
    };

    const result = generator.generatePairs(profiles, candidates, ownership);
    expect(result.pairs.length).toBe(0);
  });

  test('3. Duplicate prevention: Exactly one pair generated for same opportunity across multiple references', () => {
    const profiles: IdentityProfile[] = [
      { resolvedId: 'usr_12', email: 'owner@test.com', sessionIds: ['sess_owner'] },
      { resolvedId: 'usr_13', email: 'other@test.com', sessionIds: ['sess_other'] }
    ];

    const candidates: ReplayCandidateInventory = {
      // Two candidates pointing to the same family representing multiple operations
      candidates: [
        createMockCandidate({ id: 'cand1', family: '/rest/basket/:basketId' }),
        createMockCandidate({ id: 'cand2', family: '/rest/basket/:basketId' })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const observations: OwnershipObservation[] = [
      createMockObservation({
        id: 'obs1',
        subject: 'usr_12',
        relationship: 'OWNS',
        family: '/rest/basket/:basketId',
        concreteId: '1'
      })
    ];

    const ownership: OwnershipInventory = {
      observations,
      relationshipsBySubject: { usr_12: observations },
      resourceOwners: { '/rest/basket/:basketId::1': ['usr_12'] }
    };

    const result = generator.generatePairs(profiles, candidates, ownership);

    // Duplicate prevention ensures exactly one pair is created per user-resource pair
    expect(result.pairs.length).toBe(1);
  });

  test('4. Resource instance identity stability (human-readable format check)', () => {
    const profiles: IdentityProfile[] = [
      { resolvedId: 'usr_12', email: 'owner@test.com', sessionIds: ['sess_owner'] },
      { resolvedId: 'usr_13', email: 'other@test.com', sessionIds: ['sess_other'] }
    ];

    const candidates: ReplayCandidateInventory = {
      candidates: [createMockCandidate({ id: 'cand1', family: '/tenant/:tenantId/user/:userId' })],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const observations: OwnershipObservation[] = [
      createMockObservation({
        id: 'obs1',
        subject: 'usr_12',
        relationship: 'OWNS',
        family: '/tenant/:tenantId/user/:userId',
        concreteId: '1:55'
      })
    ];

    const ownership: OwnershipInventory = {
      observations,
      relationshipsBySubject: { usr_12: observations },
      resourceOwners: { '/tenant/:tenantId/user/:userId::1:55': ['usr_12'] }
    };

    const result = generator.generatePairs(profiles, candidates, ownership);

    const pair = result.pairs[0];
    expect(pair.resourceInstanceKey).toBe('/tenant/:tenantId/user/:userId::1:55');
    expect(pair.pairId).toBe('pr_IDOR_usr_13_tenant_tenantId_user_userId::1:55');
  });

  test('5. BAC classification driven by privilege signals and boundary indicators', () => {
    const profiles: IdentityProfile[] = [
      { resolvedId: 'usr_12', email: 'owner@test.com', sessionIds: ['sess_owner'] },
      { resolvedId: 'usr_13', email: 'other@test.com', sessionIds: ['sess_other'] }
    ];

    const candidates: ReplayCandidateInventory = {
      // Replay Candidate contains PRIVILEGE_TRANSITION_OBSERVED boundary signal
      candidates: [
        createMockCandidate({
          id: 'cand1',
          family: '/rest/user/:userId',
          surface: 'User Surface',
          vector: 'IDOR', // Vector is IDOR in candidate, but promoted in pair based on boundary signals
          reasons: ['OBJECT_IDENTIFIER_PRESENT', 'PRIVILEGE_TRANSITION_OBSERVED']
        })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const observations: OwnershipObservation[] = [
      createMockObservation({
        id: 'obs1',
        subject: 'usr_12',
        relationship: 'OWNS',
        family: '/rest/user/:userId',
        concreteId: '12'
      })
    ];

    const ownership: OwnershipInventory = {
      observations,
      relationshipsBySubject: { usr_12: observations },
      resourceOwners: { '/rest/user/:userId::12': ['usr_12'] }
    };

    const result = generator.generatePairs(profiles, candidates, ownership);

    expect(result.pairs.length).toBe(1);
    expect(result.pairs[0].vector).toBe('BAC'); // Correctly promoted to BAC
  });

  test('6. Tenant isolation classification driven by cross-tenant mismatches', () => {
    const profiles: IdentityProfile[] = [
      { resolvedId: 'usr_12', email: 'owner@test.com', sessionIds: ['sess_owner'] },
      { resolvedId: 'usr_13', email: 'other@test.com', sessionIds: ['sess_other'] }
    ];

    const candidates: ReplayCandidateInventory = {
      candidates: [createMockCandidate({ id: 'cand1', family: '/api/invoice/:invoiceId' })],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const observations: OwnershipObservation[] = [
      // 1. Owner belongs to Tenant Alpha
      createMockObservation({
        id: 'obs1',
        subject: 'usr_12',
        relationship: 'MEMBER_OF',
        family: 'TENANT_CONTEXT',
        concreteId: 'tenant_alpha'
      }),
      // 2. Resource scoped to Tenant Alpha
      createMockObservation({
        id: 'obs2',
        subject: 'tenant_alpha',
        subjectType: 'TENANT',
        relationship: 'SCOPED_TO',
        family: '/api/invoice/:invoiceId',
        concreteId: '1002'
      }),
      // 3. Attacker belongs to Tenant Beta (cross-tenant mismatch)
      createMockObservation({
        id: 'obs3',
        subject: 'usr_13',
        relationship: 'MEMBER_OF',
        family: 'TENANT_CONTEXT',
        concreteId: 'tenant_beta'
      }),
      // 4. Resource ownership evidence
      createMockObservation({
        id: 'obs4',
        subject: 'usr_12',
        relationship: 'OWNS',
        family: '/api/invoice/:invoiceId',
        concreteId: '1002'
      })
    ];

    const ownership: OwnershipInventory = {
      observations,
      relationshipsBySubject: {
        usr_12: [observations[0], observations[3]],
        usr_13: [observations[2]]
      },
      resourceOwners: { '/api/invoice/:invoiceId::1002': ['usr_12'] }
    };

    const result = generator.generatePairs(profiles, candidates, ownership);

    expect(result.pairs.length).toBe(1);
    expect(result.pairs[0].vector).toBe('TENANT_ISOLATION');
  });

  test('7. Deterministic ordering of pairs inventory list', () => {
    const profiles: IdentityProfile[] = [
      { resolvedId: 'usr_owner', email: 'owner@test.com', sessionIds: ['sess_owner'] },
      { resolvedId: 'usr_attacker', email: 'other@test.com', sessionIds: ['sess_other'] }
    ];

    const candidates: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({ id: 'cand1', family: '/rest/basket/:basketId' })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    // Shuffled discovery of resource instances
    const observations: OwnershipObservation[] = [
      createMockObservation({
        id: 'obs2',
        subject: 'usr_owner',
        relationship: 'OWNS',
        family: '/rest/basket/:basketId',
        concreteId: '2'
      }),
      createMockObservation({
        id: 'obs1',
        subject: 'usr_owner',
        relationship: 'OWNS',
        family: '/rest/basket/:basketId',
        concreteId: '1'
      })
    ];

    const ownership: OwnershipInventory = {
      observations,
      relationshipsBySubject: { usr_owner: observations },
      resourceOwners: {
        '/rest/basket/:basketId::2': ['usr_owner'],
        '/rest/basket/:basketId::1': ['usr_owner']
      }
    };

    const result = generator.generatePairs(profiles, candidates, ownership);

    // Sorted by pairId: ...::1 comes before ...::2
    expect(result.pairs[0].pairId).toContain('::1');
    expect(result.pairs[1].pairId).toContain('::2');
  });

  test('8. Repeated execution stability yields byte-identical representations', () => {
    const profiles: IdentityProfile[] = [
      { resolvedId: 'usr_12', email: 'owner@test.com', sessionIds: ['sess_owner'] },
      { resolvedId: 'usr_13', email: 'other@test.com', sessionIds: ['sess_other'] }
    ];

    const candidates: ReplayCandidateInventory = {
      candidates: [createMockCandidate({ id: 'cand1', family: '/rest/basket/:basketId' })],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const observations: OwnershipObservation[] = [
      createMockObservation({
        id: 'obs1',
        subject: 'usr_12',
        relationship: 'OWNS',
        family: '/rest/basket/:basketId',
        concreteId: '1'
      })
    ];

    const ownership: OwnershipInventory = {
      observations,
      relationshipsBySubject: { usr_12: observations },
      resourceOwners: { '/rest/basket/:basketId::1': ['usr_12'] }
    };

    const res1 = generator.generatePairs(profiles, candidates, ownership);
    const res2 = generator.generatePairs(profiles, candidates, ownership);

    expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
  });

  test('9. No timestamps are present in returned inventory', () => {
    const profiles: IdentityProfile[] = [
      { resolvedId: 'usr_12', email: 'owner@test.com', sessionIds: ['sess_owner'] },
      { resolvedId: 'usr_13', email: 'other@test.com', sessionIds: ['sess_other'] }
    ];

    const candidates: ReplayCandidateInventory = {
      candidates: [createMockCandidate({ id: 'cand1', family: '/rest/basket/:basketId' })],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const ownership: OwnershipInventory = {
      observations: [],
      relationshipsBySubject: {},
      resourceOwners: {}
    };

    const result = generator.generatePairs(profiles, candidates, ownership);
    expect((result as any).generatedAt).toBeUndefined();
    expect((result as any).timestamp).toBeUndefined();
  });

  test('10. No randomness exists in generated pair outputs', () => {
    const profiles: IdentityProfile[] = [
      { resolvedId: 'usr_12', email: 'owner@test.com', sessionIds: ['sess_owner'] },
      { resolvedId: 'usr_13', email: 'other@test.com', sessionIds: ['sess_other'] }
    ];

    const candidates: ReplayCandidateInventory = {
      candidates: [createMockCandidate({ id: 'cand1', family: '/rest/basket/:basketId' })],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const observations: OwnershipObservation[] = [
      createMockObservation({
        id: 'obs1',
        subject: 'usr_12',
        relationship: 'OWNS',
        family: '/rest/basket/:basketId',
        concreteId: '1'
      })
    ];

    const ownership: OwnershipInventory = {
      observations,
      relationshipsBySubject: { usr_12: observations },
      resourceOwners: { '/rest/basket/:basketId::1': ['usr_12'] }
    };

    const result = generator.generatePairs(profiles, candidates, ownership);
    
    // Validate frozen immutable characteristics
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.pairs)).toBe(true);
    expect(Object.isFrozen(result.pairsByVector)).toBe(true);
  });
});
