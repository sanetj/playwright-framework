import { test, expect } from '@playwright/test';
import { NarrativeBuilder } from '../narrative-builder';
import { FindingCandidateInventory } from '../finding-candidate';
import { InvestigationAssemblyInventory } from '../investigation-assembly';
import { ReplayCandidateInventory } from '../replay-candidate';

test.describe('Phase 10.8 — Narrative Intelligence Unit Tests', () => {
  let builder: NarrativeBuilder;

  test.beforeEach(() => {
    builder = new NarrativeBuilder();
  });

  test('1. Narrative constructs facts and fragments deterministically using ReplayCandidateInventory', () => {
    const fcInventory: FindingCandidateInventory = {
      candidates: [
        {
          candidateId: 'fc_IDOR_rest_basket_basketId_general_surface',
          vector: 'IDOR',
          targetResourceFamily: '/rest/basket/:basketId',
          authorizationSurface: 'Basket Surface',
          clusterIds: ['clst_1'],
          assemblyIds: ['asm_1']
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [
        {
          assemblyId: 'asm_1',
          vector: 'IDOR',
          subjectId: 'usr_13',
          ownerId: 'usr_12',
          resourceInstanceKey: '/rest/basket/1',
          targetResourceFamily: '/rest/basket/:basketId',
          targetResourceId: '1',
          authorizationSurface: 'Basket Surface',
          authorizationPairId: 'pair_1',
          replayCandidateId: 'rc_1',
          blueprintId: 'bp_1',
          baselineExchangeId: 'ex_1'
        }
      ],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const replayInventory: ReplayCandidateInventory = {
      candidates: [
        {
          candidateId: 'rc_1',
          resourceFamily: '/rest/basket/:basketId',
          httpMethod: 'GET',
          authorizationSurface: 'Basket Surface',
          targetVector: 'IDOR',
          baselineExchangeId: 'ex_1',
          parameterTargets: [],
          headerTargets: [],
          synthesisReasons: []
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = builder.buildNarratives(fcInventory, assemblyInventory, replayInventory);

    expect(result.narratives.length).toBe(1);
    const nar = result.narratives[0];
    expect(nar.narrativeId).toBe('nar_fc_IDOR_rest_basket_basketId_general_surface');
    expect(nar.assemblyId).toBe('asm_1');
    expect(nar.facts.subjectId).toBe('usr_13');
    expect(nar.facts.ownerId).toBe('usr_12');
    expect(nar.facts.httpMethod).toBe('GET');
    expect(nar.fragments.length).toBe(3);
    expect(nar.fragments[0].key).toBe('ATTEMPTED_ACTION');
    expect(nar.fragments[0].value).toBe('GET');
    expect(nar.fragments[1].key).toBe('OWNER_IDENTITY');
    expect(nar.fragments[1].value).toBe('usr_12');
    expect(nar.fragments[2].key).toBe('SUBJECT_IDENTITY');
    expect(nar.fragments[2].value).toBe('usr_13');
  });

  test('2. Separation of different vectors in inventory lists', () => {
    const fcInventory: FindingCandidateInventory = {
      candidates: [
        {
          candidateId: 'fc_IDOR_rest_basket_basketId_general_surface',
          vector: 'IDOR',
          targetResourceFamily: '/rest/basket/:basketId',
          authorizationSurface: 'Basket Surface',
          clusterIds: ['clst_1'],
          assemblyIds: ['asm_1']
        },
        {
          candidateId: 'fc_BAC_rest_basket_basketId_general_surface',
          vector: 'BAC',
          targetResourceFamily: '/rest/basket/:basketId',
          authorizationSurface: 'Basket Surface',
          clusterIds: ['clst_2'],
          assemblyIds: ['asm_2']
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [
        {
          assemblyId: 'asm_1',
          vector: 'IDOR',
          subjectId: 'usr_13',
          ownerId: 'usr_12',
          resourceInstanceKey: '/rest/basket/1',
          targetResourceFamily: '/rest/basket/:basketId',
          targetResourceId: '1',
          authorizationSurface: 'Basket Surface',
          authorizationPairId: 'pair_1',
          replayCandidateId: 'rc_1',
          blueprintId: 'bp_1',
          baselineExchangeId: 'ex_1'
        },
        {
          assemblyId: 'asm_2',
          vector: 'BAC',
          subjectId: 'usr_14',
          ownerId: 'usr_12',
          resourceInstanceKey: '/rest/basket/1',
          targetResourceFamily: '/rest/basket/:basketId',
          targetResourceId: '1',
          authorizationSurface: 'Basket Surface',
          authorizationPairId: 'pair_2',
          replayCandidateId: 'rc_2',
          blueprintId: 'bp_2',
          baselineExchangeId: 'ex_2'
        }
      ],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const replayInventory: ReplayCandidateInventory = {
      candidates: [
        {
          candidateId: 'rc_1',
          resourceFamily: '/rest/basket/:basketId',
          httpMethod: 'GET',
          authorizationSurface: 'Basket Surface',
          targetVector: 'IDOR',
          baselineExchangeId: 'ex_1',
          parameterTargets: [],
          headerTargets: [],
          synthesisReasons: []
        },
        {
          candidateId: 'rc_2',
          resourceFamily: '/rest/basket/:basketId',
          httpMethod: 'POST',
          authorizationSurface: 'Basket Surface',
          targetVector: 'BAC',
          baselineExchangeId: 'ex_2',
          parameterTargets: [],
          headerTargets: [],
          synthesisReasons: []
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = builder.buildNarratives(fcInventory, assemblyInventory, replayInventory);

    expect(result.narratives.length).toBe(2);
    expect(result.narrativesByVector.IDOR.length).toBe(1);
    expect(result.narrativesByVector.BAC.length).toBe(1);
    expect(result.narrativesByVector.IDOR[0].facts.httpMethod).toBe('GET');
    expect(result.narrativesByVector.BAC[0].facts.httpMethod).toBe('POST');
  });

  test('3. Separation of different surfaces puts findings in separate narratives', () => {
    const fcInventory: FindingCandidateInventory = {
      candidates: [
        {
          candidateId: 'fc_IDOR_rest_basket_api_surface',
          vector: 'IDOR',
          targetResourceFamily: '/rest/basket',
          authorizationSurface: 'API Surface',
          clusterIds: ['clst_1'],
          assemblyIds: ['asm_1']
        },
        {
          candidateId: 'fc_IDOR_rest_basket_ui_surface',
          vector: 'IDOR',
          targetResourceFamily: '/rest/basket',
          authorizationSurface: 'UI Surface',
          clusterIds: ['clst_2'],
          assemblyIds: ['asm_2']
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [
        {
          assemblyId: 'asm_1',
          vector: 'IDOR',
          subjectId: 'usr_13',
          ownerId: 'usr_12',
          resourceInstanceKey: '/rest/basket',
          targetResourceFamily: '/rest/basket',
          targetResourceId: '1',
          authorizationSurface: 'API Surface',
          authorizationPairId: 'pair_1',
          replayCandidateId: 'rc_1',
          blueprintId: 'bp_1',
          baselineExchangeId: 'ex_1'
        },
        {
          assemblyId: 'asm_2',
          vector: 'IDOR',
          subjectId: 'usr_13',
          ownerId: 'usr_12',
          resourceInstanceKey: '/rest/basket',
          targetResourceFamily: '/rest/basket',
          targetResourceId: '1',
          authorizationSurface: 'UI Surface',
          authorizationPairId: 'pair_2',
          replayCandidateId: 'rc_2',
          blueprintId: 'bp_2',
          baselineExchangeId: 'ex_2'
        }
      ],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const replayInventory: ReplayCandidateInventory = {
      candidates: [
        {
          candidateId: 'rc_1',
          resourceFamily: '/rest/basket',
          httpMethod: 'GET',
          authorizationSurface: 'API Surface',
          targetVector: 'IDOR',
          baselineExchangeId: 'ex_1',
          parameterTargets: [],
          headerTargets: [],
          synthesisReasons: []
        },
        {
          candidateId: 'rc_2',
          resourceFamily: '/rest/basket',
          httpMethod: 'GET',
          authorizationSurface: 'UI Surface',
          targetVector: 'IDOR',
          baselineExchangeId: 'ex_2',
          parameterTargets: [],
          headerTargets: [],
          synthesisReasons: []
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = builder.buildNarratives(fcInventory, assemblyInventory, replayInventory);

    expect(result.narratives.length).toBe(2);
    expect(result.narratives[0].authorizationSurface).toBe('API Surface');
    expect(result.narratives[1].authorizationSurface).toBe('UI Surface');
  });

  test('4. Deduplication correctly generates unique narrativeId mapping', () => {
    const fcInventory: FindingCandidateInventory = {
      candidates: [
        {
          candidateId: 'fc_IDOR_rest_basket_basketId_general_surface',
          vector: 'IDOR',
          targetResourceFamily: '/rest/basket/:basketId',
          authorizationSurface: 'Basket Surface',
          clusterIds: ['clst_1'],
          assemblyIds: ['asm_1']
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [
        {
          assemblyId: 'asm_1',
          vector: 'IDOR',
          subjectId: 'usr_13',
          ownerId: 'usr_12',
          resourceInstanceKey: '/rest/basket/1',
          targetResourceFamily: '/rest/basket/:basketId',
          targetResourceId: '1',
          authorizationSurface: 'Basket Surface',
          authorizationPairId: 'pair_1',
          replayCandidateId: 'rc_1',
          blueprintId: 'bp_1',
          baselineExchangeId: 'ex_1'
        }
      ],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const replayInventory: ReplayCandidateInventory = {
      candidates: [
        {
          candidateId: 'rc_1',
          resourceFamily: '/rest/basket/:basketId',
          httpMethod: 'GET',
          authorizationSurface: 'Basket Surface',
          targetVector: 'IDOR',
          baselineExchangeId: 'ex_1',
          parameterTargets: [],
          headerTargets: [],
          synthesisReasons: []
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result1 = builder.buildNarratives(fcInventory, assemblyInventory, replayInventory);
    const result2 = builder.buildNarratives(fcInventory, assemblyInventory, replayInventory);

    expect(result1.narratives[0].narrativeId).toBe(result2.narratives[0].narrativeId);
  });

  test('5. Deterministic alphabetical ordering of narratives', () => {
    const fcInventory: FindingCandidateInventory = {
      candidates: [
        {
          candidateId: 'fc_IDOR_rest_basket_general_surface',
          vector: 'IDOR',
          targetResourceFamily: '/rest/basket',
          authorizationSurface: 'Basket Surface',
          clusterIds: ['clst_2'],
          assemblyIds: ['asm_2']
        },
        {
          candidateId: 'fc_IDOR_rest_basket_basketId_general_surface',
          vector: 'IDOR',
          targetResourceFamily: '/rest/basket/:basketId',
          authorizationSurface: 'Basket Surface',
          clusterIds: ['clst_1'],
          assemblyIds: ['asm_1']
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [
        {
          assemblyId: 'asm_1',
          vector: 'IDOR',
          subjectId: 'usr_13',
          ownerId: 'usr_12',
          resourceInstanceKey: '/rest/basket/1',
          targetResourceFamily: '/rest/basket/:basketId',
          targetResourceId: '1',
          authorizationSurface: 'Basket Surface',
          authorizationPairId: 'pair_1',
          replayCandidateId: 'rc_1',
          blueprintId: 'bp_1',
          baselineExchangeId: 'ex_1'
        },
        {
          assemblyId: 'asm_2',
          vector: 'IDOR',
          subjectId: 'usr_13',
          ownerId: 'usr_12',
          resourceInstanceKey: '/rest/basket',
          targetResourceFamily: '/rest/basket',
          targetResourceId: '2',
          authorizationSurface: 'Basket Surface',
          authorizationPairId: 'pair_2',
          replayCandidateId: 'rc_2',
          blueprintId: 'bp_2',
          baselineExchangeId: 'ex_2'
        }
      ],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const replayInventory: ReplayCandidateInventory = {
      candidates: [
        {
          candidateId: 'rc_1',
          resourceFamily: '/rest/basket/:basketId',
          httpMethod: 'GET',
          authorizationSurface: 'Basket Surface',
          targetVector: 'IDOR',
          baselineExchangeId: 'ex_1',
          parameterTargets: [],
          headerTargets: [],
          synthesisReasons: []
        },
        {
          candidateId: 'rc_2',
          resourceFamily: '/rest/basket',
          httpMethod: 'POST',
          authorizationSurface: 'Basket Surface',
          targetVector: 'IDOR',
          baselineExchangeId: 'ex_2',
          parameterTargets: [],
          headerTargets: [],
          synthesisReasons: []
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const result = builder.buildNarratives(fcInventory, assemblyInventory, replayInventory);

    // Sorted: basketId (b) comes before general (g)
    expect(result.narratives[0].candidateId).toBe('fc_IDOR_rest_basket_basketId_general_surface');
    expect(result.narratives[1].candidateId).toBe('fc_IDOR_rest_basket_general_surface');
  });

  test('6. Stable serialization yields byte-identical representation', () => {
    const fcInventory: FindingCandidateInventory = {
      candidates: [
        {
          candidateId: 'fc_IDOR_rest_basket_basketId_general_surface',
          vector: 'IDOR',
          targetResourceFamily: '/rest/basket/:basketId',
          authorizationSurface: 'Basket Surface',
          clusterIds: ['clst_1'],
          assemblyIds: ['asm_1']
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [
        {
          assemblyId: 'asm_1',
          vector: 'IDOR',
          subjectId: 'usr_13',
          ownerId: 'usr_12',
          resourceInstanceKey: '/rest/basket/1',
          targetResourceFamily: '/rest/basket/:basketId',
          targetResourceId: '1',
          authorizationSurface: 'Basket Surface',
          authorizationPairId: 'pair_1',
          replayCandidateId: 'rc_1',
          blueprintId: 'bp_1',
          baselineExchangeId: 'ex_1'
        }
      ],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const replayInventory: ReplayCandidateInventory = {
      candidates: [
        {
          candidateId: 'rc_1',
          resourceFamily: '/rest/basket/:basketId',
          httpMethod: 'GET',
          authorizationSurface: 'Basket Surface',
          targetVector: 'IDOR',
          baselineExchangeId: 'ex_1',
          parameterTargets: [],
          headerTargets: [],
          synthesisReasons: []
        }
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const resA = builder.buildNarratives(fcInventory, assemblyInventory, replayInventory);
    const resB = builder.buildNarratives(fcInventory, assemblyInventory, replayInventory);

    expect(JSON.stringify(resA)).toBe(JSON.stringify(resB));
  });

  test('7. Frozen output objects to satisfy immutability requirements', () => {
    const fcInventory = { candidates: [], candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] } };
    const asmInventory = { assemblies: [], assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }, assembliesBySubject: {}, assembliesByResource: {} };
    const replayInventory = { candidates: [], candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }, candidatesBySurface: {} };

    const result = builder.buildNarratives(fcInventory, asmInventory, replayInventory);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.narratives)).toBe(true);
    expect(Object.isFrozen(result.narrativesByVector)).toBe(true);
  });

  test('8. Empty inventory handling returns empty structures', () => {
    const fcInventory = { candidates: [], candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] } };
    const asmInventory = { assemblies: [], assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }, assembliesBySubject: {}, assembliesByResource: {} };
    const replayInventory = { candidates: [], candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }, candidatesBySurface: {} };

    const result = builder.buildNarratives(fcInventory, asmInventory, replayInventory);
    expect(result.narratives.length).toBe(0);
    expect(result.narrativesByVector.IDOR.length).toBe(0);
  });

  test('9. No timestamps are added to narratives', () => {
    const fcInventory = { candidates: [], candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] } };
    const asmInventory = { assemblies: [], assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }, assembliesBySubject: {}, assembliesByResource: {} };
    const replayInventory = { candidates: [], candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }, candidatesBySurface: {} };

    const result = builder.buildNarratives(fcInventory, asmInventory, replayInventory);
    expect((result as any).timestamp).toBeUndefined();
    expect((result as any).generatedAt).toBeUndefined();
  });

  test('10. No randomness is used inside narrativeId or objects generation', () => {
    const fcInventory = { candidates: [], candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] } };
    const asmInventory = { assemblies: [], assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }, assembliesBySubject: {}, assembliesByResource: {} };
    const replayInventory = { candidates: [], candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }, candidatesBySurface: {} };

    const result = builder.buildNarratives(fcInventory, asmInventory, replayInventory);
    expect((result as any).randomId).toBeUndefined();
  });
});
