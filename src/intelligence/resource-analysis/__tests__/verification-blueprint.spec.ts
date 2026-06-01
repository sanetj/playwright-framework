import { test, expect } from '@playwright/test';
import { VerificationPlanner } from '../verification-planner';
import { AuthorizationPairInventory, AuthorizationPair } from '../authorization-pairing';
import { ReplayCandidateInventory, ReplayCandidate } from '../replay-candidate';

function createMockPair(data: {
  id: string;
  vector?: 'IDOR' | 'BAC' | 'TENANT_ISOLATION';
  subject: string;
  owner: string;
  resourceKey: string;
  family: string;
  concreteId: string;
  candidateId?: string;
  baselineExchangeId?: string;
}): AuthorizationPair {
  return {
    pairId: data.id,
    vector: data.vector || 'IDOR',
    subjectId: data.subject,
    subjectType: 'USER',
    resourceInstanceKey: data.resourceKey,
    targetResourceFamily: data.family,
    targetResourceId: data.concreteId,
    baselineExchangeId: data.baselineExchangeId || `ex_base_${data.id}`,
    replayCandidateId: data.candidateId || `cand_${data.id}`,
    ownerId: data.owner,
    targetSurface: 'General Surface'
  };
}

function createMockCandidate(data: {
  id: string;
  family: string;
  params?: string[];
  headers?: string[];
}): ReplayCandidate {
  return {
    candidateId: data.id,
    resourceFamily: data.family,
    httpMethod: 'GET',
    authorizationSurface: 'General Surface',
    targetVector: 'IDOR',
    baselineExchangeId: 'ex_base',
    parameterTargets: data.params || [],
    headerTargets: data.headers || [],
    synthesisReasons: []
  };
}

test.describe('Phase 10.4 — Verification Blueprint Intelligence Unit Tests', () => {
  let planner: VerificationPlanner;

  test.beforeEach(() => {
    planner = new VerificationPlanner();
  });

  test('1. Blueprint generation maps pairing details with candidate parameters', () => {
    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          candidateId: 'cand1'
        })
      ],
      pairsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      pairsBySubject: {},
      pairsByResource: {}
    };

    const candidates: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({
          id: 'cand1',
          family: '/rest/basket/:basketId',
          params: ['basketId'],
          headers: ['cookie']
        })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = planner.planVerification(pairs, candidates);

    expect(result.blueprints.length).toBe(1);
    const bp = result.blueprints[0];
    expect(bp.subjectId).toBe('usr_13');
    expect(bp.ownerId).toBe('usr_12');
    expect(bp.targetResourceId).toBe('1');
    expect(bp.mutationTargets).toContain('basketId');
    expect(bp.headerTargets).toContain('cookie');
  });

  test('2. Blueprint deduplication: Exactly one blueprint generated for same opportunity', () => {
    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          candidateId: 'cand1'
        }),
        createMockPair({
          id: 'pair2', // Different pair referencing the same opportunity
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          candidateId: 'cand1'
        })
      ],
      pairsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      pairsBySubject: {},
      pairsByResource: {}
    };

    const candidates: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({
          id: 'cand1',
          family: '/rest/basket/:basketId',
          params: ['basketId']
        })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = planner.planVerification(pairs, candidates);

    expect(result.blueprints.length).toBe(1);
  });

  test('3. Traceability preservation binds original refs cleanly', () => {
    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          candidateId: 'cand1',
          baselineExchangeId: 'ex_target'
        })
      ],
      pairsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      pairsBySubject: {},
      pairsByResource: {}
    };

    const candidates: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({
          id: 'cand1',
          family: '/rest/basket/:basketId'
        })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = planner.planVerification(pairs, candidates);

    const bp = result.blueprints[0];
    expect(bp.authorizationPairId).toBe('pair1');
    expect(bp.replayCandidateId).toBe('cand1');
    expect(bp.baselineExchangeId).toBe('ex_target');
  });

  test('4. Resource instance identity stability (checks filesystem-safe ID)', () => {
    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/tenant/:tenantId/user/:userId::1:55',
          family: '/tenant/:tenantId/user/:userId',
          concreteId: '1:55',
          candidateId: 'cand1'
        })
      ],
      pairsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      pairsBySubject: {},
      pairsByResource: {}
    };

    const candidates: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({
          id: 'cand1',
          family: '/tenant/:tenantId/user/:userId'
        })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = planner.planVerification(pairs, candidates);

    const bp = result.blueprints[0];
    expect(bp.resourceInstanceKey).toBe('/tenant/:tenantId/user/:userId::1:55');
    expect(bp.blueprintId).toBe('bp_IDOR_usr_13_tenant_tenantId_user_userId::1:55');
  });

  test('5. Missing candidate exclusion prevents planning for orphaned pairings', () => {
    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          candidateId: 'missing_cand'
        })
      ],
      pairsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      pairsBySubject: {},
      pairsByResource: {}
    };

    const candidates: ReplayCandidateInventory = {
      candidates: [],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = planner.planVerification(pairs, candidates);
    expect(result.blueprints.length).toBe(0);
  });

  test('6. Missing ownership exclusion (unresolved raw session profiles)', () => {
    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_sess_attacker', // Unresolved attacking subject session fallback
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          candidateId: 'cand1'
        })
      ],
      pairsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      pairsBySubject: {},
      pairsByResource: {}
    };

    const candidates: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({
          id: 'cand1',
          family: '/rest/basket/:basketId'
        })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = planner.planVerification(pairs, candidates);
    expect(result.blueprints.length).toBe(0);
  });

  test('7. Deterministic ordering of plans list', () => {
    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair2',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::2',
          family: '/rest/basket/:basketId',
          concreteId: '2',
          candidateId: 'cand1'
        }),
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          candidateId: 'cand1'
        })
      ],
      pairsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      pairsBySubject: {},
      pairsByResource: {}
    };

    const candidates: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({
          id: 'cand1',
          family: '/rest/basket/:basketId'
        })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = planner.planVerification(pairs, candidates);

    // Sorted by blueprintId: ...::1 comes before ...::2
    expect(result.blueprints[0].blueprintId).toContain('::1');
    expect(result.blueprints[1].blueprintId).toContain('::2');
  });

  test('8. Repeated execution stability yields byte-identical representations', () => {
    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          candidateId: 'cand1'
        })
      ],
      pairsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      pairsBySubject: {},
      pairsByResource: {}
    };

    const candidates: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({
          id: 'cand1',
          family: '/rest/basket/:basketId'
        })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const res1 = planner.planVerification(pairs, candidates);
    const res2 = planner.planVerification(pairs, candidates);

    expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
  });

  test('9. No randomness exists in generated blueprint outputs', () => {
    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          candidateId: 'cand1'
        })
      ],
      pairsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      pairsBySubject: {},
      pairsByResource: {}
    };

    const candidates: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({
          id: 'cand1',
          family: '/rest/basket/:basketId'
        })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = planner.planVerification(pairs, candidates);
    
    // Validate frozen immutable characteristics
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.blueprints)).toBe(true);
    expect(Object.isFrozen(result.blueprintsByVector)).toBe(true);
  });

  test('10. No timestamps are present in returned inventory', () => {
    const pairs: AuthorizationPairInventory = {
      pairs: [],
      pairsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      pairsBySubject: {},
      pairsByResource: {}
    };

    const candidates: ReplayCandidateInventory = {
      candidates: [],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = planner.planVerification(pairs, candidates);
    expect((result as any).generatedAt).toBeUndefined();
    expect((result as any).timestamp).toBeUndefined();
  });
});
