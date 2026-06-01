import { test, expect } from '@playwright/test';
import { InvestigationAssembler } from '../investigation-assembler';
import { VerificationBlueprintInventory, VerificationBlueprint } from '../verification-blueprint';
import { AuthorizationPairInventory, AuthorizationPair } from '../authorization-pairing';
import { ReplayCandidateInventory, ReplayCandidate } from '../replay-candidate';

function createMockBlueprint(data: {
  id: string;
  vector?: 'IDOR' | 'BAC' | 'TENANT_ISOLATION';
  subject: string;
  owner: string;
  resourceKey: string;
  family: string;
  concreteId: string;
  pairId?: string;
  candidateId?: string;
  baselineExchangeId?: string;
}): VerificationBlueprint {
  return {
    blueprintId: data.id,
    vector: data.vector || 'IDOR',
    authorizationPairId: data.pairId || `pair_${data.id}`,
    replayCandidateId: data.candidateId || `cand_${data.id}`,
    baselineExchangeId: data.baselineExchangeId || `ex_base_${data.id}`,
    subjectId: data.subject,
    ownerId: data.owner,
    resourceInstanceKey: data.resourceKey,
    targetResourceFamily: data.family,
    targetResourceId: data.concreteId,
    authorizationSurface: 'General Surface',
    mutationTargets: [],
    headerTargets: []
  };
}

function createMockPair(data: {
  id: string;
  subject: string;
  owner: string;
  resourceKey: string;
  family: string;
  concreteId: string;
}): AuthorizationPair {
  return {
    pairId: data.id,
    vector: 'IDOR',
    subjectId: data.subject,
    subjectType: 'USER',
    resourceInstanceKey: data.resourceKey,
    targetResourceFamily: data.family,
    targetResourceId: data.concreteId,
    baselineExchangeId: 'ex_base',
    replayCandidateId: 'cand_test',
    ownerId: data.owner,
    targetSurface: 'General Surface'
  };
}

function createMockCandidate(data: {
  id: string;
  family: string;
}): ReplayCandidate {
  return {
    candidateId: data.id,
    resourceFamily: data.family,
    httpMethod: 'GET',
    authorizationSurface: 'General Surface',
    targetVector: 'IDOR',
    baselineExchangeId: 'ex_base',
    parameterTargets: [],
    headerTargets: [],
    synthesisReasons: []
  };
}

test.describe('Phase 10.5 — Investigation Assembly Intelligence Unit Tests', () => {
  let assembler: InvestigationAssembler;

  test.beforeEach(() => {
    assembler = new InvestigationAssembler();
  });

  test('1. Assembly generation links blueprint details to target inventory mapping', () => {
    const blueprints: VerificationBlueprintInventory = {
      blueprints: [
        createMockBlueprint({
          id: 'bp1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          pairId: 'pair1',
          candidateId: 'cand1'
        })
      ],
      blueprintsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      blueprintsBySubject: {}
    };

    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1'
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

    const result = assembler.assembleInvestigation(blueprints, pairs, candidates);

    expect(result.assemblies.length).toBe(1);
    const asm = result.assemblies[0];
    expect(asm.subjectId).toBe('usr_13');
    expect(asm.ownerId).toBe('usr_12');
    expect(asm.targetResourceId).toBe('1');
    expect(asm.vector).toBe('IDOR');
  });

  test('2. Canonical reference preservation maps strictly string reference IDs', () => {
    const blueprints: VerificationBlueprintInventory = {
      blueprints: [
        createMockBlueprint({
          id: 'bp1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          pairId: 'pair1',
          candidateId: 'cand1',
          baselineExchangeId: 'ex_template'
        })
      ],
      blueprintsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      blueprintsBySubject: {}
    };

    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1'
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

    const result = assembler.assembleInvestigation(blueprints, pairs, candidates);

    const asm = result.assemblies[0];
    expect(asm.authorizationPairId).toBe('pair1');
    expect(asm.replayCandidateId).toBe('cand1');
    expect(asm.blueprintId).toBe('bp1');
    expect(asm.baselineExchangeId).toBe('ex_template');
  });

  test('3. No embedded object storage: Assemblies contain no nested upstream objects', () => {
    const blueprints: VerificationBlueprintInventory = {
      blueprints: [
        createMockBlueprint({
          id: 'bp1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          pairId: 'pair1',
          candidateId: 'cand1'
        })
      ],
      blueprintsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      blueprintsBySubject: {}
    };

    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1'
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

    const result = assembler.assembleInvestigation(blueprints, pairs, candidates);

    const asm = result.assemblies[0];
    
    // Invariant checks: Ensure absolutely no embedded objects or configurations
    expect((asm as any).subjectProfile).toBeUndefined();
    expect((asm as any).ownerProfile).toBeUndefined();
    expect((asm as any).replayCandidate).toBeUndefined();
    expect((asm as any).blueprint).toBeUndefined();
    expect((asm as any).authorizationPair).toBeUndefined();
  });

  test('4. Missing pair exclusion skips assembly generation', () => {
    const blueprints: VerificationBlueprintInventory = {
      blueprints: [
        createMockBlueprint({
          id: 'bp1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          pairId: 'missing_pair',
          candidateId: 'cand1'
        })
      ],
      blueprintsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      blueprintsBySubject: {}
    };

    const pairs: AuthorizationPairInventory = {
      pairs: [], // Pair missing
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

    const result = assembler.assembleInvestigation(blueprints, pairs, candidates);
    expect(result.assemblies.length).toBe(0);
  });

  test('5. Missing candidate exclusion skips assembly generation', () => {
    const blueprints: VerificationBlueprintInventory = {
      blueprints: [
        createMockBlueprint({
          id: 'bp1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          pairId: 'pair1',
          candidateId: 'missing_cand'
        })
      ],
      blueprintsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      blueprintsBySubject: {}
    };

    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1'
        })
      ],
      pairsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      pairsBySubject: {},
      pairsByResource: {}
    };

    const candidates: ReplayCandidateInventory = {
      candidates: [], // Candidate missing
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = assembler.assembleInvestigation(blueprints, pairs, candidates);
    expect(result.assemblies.length).toBe(0);
  });

  test('6. Missing ownership exclusion (unresolved raw session profiles)', () => {
    const blueprints: VerificationBlueprintInventory = {
      blueprints: [
        createMockBlueprint({
          id: 'bp1',
          subject: 'usr_13',
          owner: 'usr_sess_owner', // Unresolved owner profile fallback
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          pairId: 'pair1',
          candidateId: 'cand1'
        })
      ],
      blueprintsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      blueprintsBySubject: {}
    };

    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_sess_owner',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1'
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

    const result = assembler.assembleInvestigation(blueprints, pairs, candidates);
    expect(result.assemblies.length).toBe(0);
  });

  test('7. Deduplication: One unique assembly mapping per opportunities target', () => {
    const blueprints: VerificationBlueprintInventory = {
      blueprints: [
        createMockBlueprint({
          id: 'bp1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          pairId: 'pair1',
          candidateId: 'cand1'
        }),
        createMockBlueprint({
          id: 'bp2', // Duplicate target template blueprint
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          pairId: 'pair1',
          candidateId: 'cand1'
        })
      ],
      blueprintsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      blueprintsBySubject: {}
    };

    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1'
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

    const result = assembler.assembleInvestigation(blueprints, pairs, candidates);

    expect(result.assemblies.length).toBe(1);
  });

  test('8. Deterministic ordering of assemblies flat list', () => {
    const blueprints: VerificationBlueprintInventory = {
      blueprints: [
        createMockBlueprint({
          id: 'bp2',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::2',
          family: '/rest/basket/:basketId',
          concreteId: '2',
          pairId: 'pair1',
          candidateId: 'cand1'
        }),
        createMockBlueprint({
          id: 'bp1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          pairId: 'pair1',
          candidateId: 'cand1'
        })
      ],
      blueprintsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      blueprintsBySubject: {}
    };

    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1'
        }),
        createMockPair({
          id: 'pair2',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::2',
          family: '/rest/basket/:basketId',
          concreteId: '2'
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

    const result = assembler.assembleInvestigation(blueprints, pairs, candidates);

    // Sorted by assemblyId: ...::1 comes before ...::2
    expect(result.assemblies[0].assemblyId).toContain('::1');
    expect(result.assemblies[1].assemblyId).toContain('::2');
  });

  test('9. Repeated execution stability yields byte-identical representations', () => {
    const blueprints: VerificationBlueprintInventory = {
      blueprints: [
        createMockBlueprint({
          id: 'bp1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1',
          pairId: 'pair1',
          candidateId: 'cand1'
        })
      ],
      blueprintsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      blueprintsBySubject: {}
    };

    const pairs: AuthorizationPairInventory = {
      pairs: [
        createMockPair({
          id: 'pair1',
          subject: 'usr_13',
          owner: 'usr_12',
          resourceKey: '/rest/basket/:basketId::1',
          family: '/rest/basket/:basketId',
          concreteId: '1'
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

    const res1 = assembler.assembleInvestigation(blueprints, pairs, candidates);
    const res2 = assembler.assembleInvestigation(blueprints, pairs, candidates);

    expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
  });

  test('10. No randomness exists in generated assemblies outputs', () => {
    const blueprints: VerificationBlueprintInventory = {
      blueprints: [],
      blueprintsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      blueprintsBySubject: {}
    };

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

    const result = assembler.assembleInvestigation(blueprints, pairs, candidates);

    // Validate frozen immutable characteristics
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.assemblies)).toBe(true);
    expect(Object.isFrozen(result.assembliesByVector)).toBe(true);
  });

  test('11. No timestamps are present in returned inventory', () => {
    const blueprints: VerificationBlueprintInventory = {
      blueprints: [],
      blueprintsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      blueprintsBySubject: {}
    };

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

    const result = assembler.assembleInvestigation(blueprints, pairs, candidates);
    expect((result as any).generatedAt).toBeUndefined();
    expect((result as any).timestamp).toBeUndefined();
  });
});
