import { test, expect } from '@playwright/test';
import { EvidenceMapper } from '../evidence-mapper';
import { FindingNarrativeInventory, FindingNarrative } from '../finding-narrative';
import { InvestigationAssemblyInventory, InvestigationAssembly } from '../investigation-assembly';

function createMockNarrative(data: {
  id: string;
  candidateId: string;
  assemblyId: string;
  vector?: 'IDOR' | 'BAC' | 'TENANT_ISOLATION';
  family: string;
  surface?: string;
}): FindingNarrative {
  return {
    narrativeId: data.id,
    candidateId: data.candidateId,
    assemblyId: data.assemblyId,
    vector: data.vector || 'IDOR',
    targetResourceFamily: data.family,
    authorizationSurface: data.surface || 'General Surface',
    facts: {
      subjectId: 'usr_13',
      ownerId: 'usr_12',
      httpMethod: 'GET'
    },
    fragments: []
  };
}

function createMockAssembly(data: {
  id: string;
  vector?: 'IDOR' | 'BAC' | 'TENANT_ISOLATION';
  family: string;
}): InvestigationAssembly {
  return {
    assemblyId: data.id,
    vector: data.vector || 'IDOR',
    subjectId: 'usr_13',
    ownerId: 'usr_12',
    resourceInstanceKey: `${data.family}::1`,
    targetResourceFamily: data.family,
    targetResourceId: '1',
    authorizationSurface: 'General Surface',
    authorizationPairId: `pair_${data.id}`,
    replayCandidateId: `cand_${data.id}`,
    blueprintId: `bp_${data.id}`,
    baselineExchangeId: `ex_${data.id}`
  };
}

test.describe('Phase 10.9 — Evidence Mapping Unit Tests', () => {
  let mapper: EvidenceMapper;

  test.beforeEach(() => {
    mapper = new EvidenceMapper();
  });

  test('1. Narrative -> Assembly mapping maps assemblyId correctly', () => {
    const nar = createMockNarrative({
      id: 'nar_1',
      candidateId: 'fc_1',
      assemblyId: 'asm_1',
      family: '/rest/basket/:basketId'
    });
    const asm = createMockAssembly({
      id: 'asm_1',
      family: '/rest/basket/:basketId'
    });

    const narInventory: FindingNarrativeInventory = {
      narratives: [nar],
      narrativesByVector: { IDOR: [nar], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [asm],
      assembliesByVector: { IDOR: [asm], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const result = mapper.mapEvidence(narInventory, assemblyInventory);

    expect(result.maps.length).toBe(1);
    expect(result.maps[0].evidence.assemblyId).toBe('asm_1');
  });

  test('2. EvidenceMap creation produces structured FindingEvidenceMap fields', () => {
    const nar = createMockNarrative({
      id: 'nar_1',
      candidateId: 'fc_1',
      assemblyId: 'asm_1',
      family: '/rest/basket/:basketId',
      surface: 'Basket Surface'
    });
    const asm = createMockAssembly({
      id: 'asm_1',
      family: '/rest/basket/:basketId'
    });

    const narInventory: FindingNarrativeInventory = {
      narratives: [nar],
      narrativesByVector: { IDOR: [nar], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [asm],
      assembliesByVector: { IDOR: [asm], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const result = mapper.mapEvidence(narInventory, assemblyInventory);

    const map = result.maps[0];
    expect(map.evidenceMapId).toBe('evmap_nar_1');
    expect(map.narrativeId).toBe('nar_1');
    expect(map.candidateId).toBe('fc_1');
    expect(map.vector).toBe('IDOR');
    expect(map.targetResourceFamily).toBe('/rest/basket/:basketId');
    expect(map.authorizationSurface).toBe('Basket Surface');
  });

  test('3. assemblyId normalization forces EvidenceReference to contain only assemblyId', () => {
    const nar = createMockNarrative({
      id: 'nar_1',
      candidateId: 'fc_1',
      assemblyId: 'asm_1',
      family: '/rest/basket/:basketId'
    });
    const asm = createMockAssembly({
      id: 'asm_1',
      family: '/rest/basket/:basketId'
    });

    const narInventory: FindingNarrativeInventory = {
      narratives: [nar],
      narrativesByVector: { IDOR: [nar], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [asm],
      assembliesByVector: { IDOR: [asm], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const result = mapper.mapEvidence(narInventory, assemblyInventory);

    const keys = Object.keys(result.maps[0].evidence);
    expect(keys).toEqual(['assemblyId']);
  });

  test('4. mapsByVector groups maps correctly into indices', () => {
    const narIdor = createMockNarrative({
      id: 'nar_idor',
      candidateId: 'fc_idor',
      assemblyId: 'asm_idor',
      vector: 'IDOR',
      family: '/rest/basket'
    });
    const narBac = createMockNarrative({
      id: 'nar_bac',
      candidateId: 'fc_bac',
      assemblyId: 'asm_bac',
      vector: 'BAC',
      family: '/rest/basket'
    });
    const asmIdor = createMockAssembly({
      id: 'asm_idor',
      vector: 'IDOR',
      family: '/rest/basket'
    });
    const asmBac = createMockAssembly({
      id: 'asm_bac',
      vector: 'BAC',
      family: '/rest/basket'
    });

    const narInventory: FindingNarrativeInventory = {
      narratives: [narBac, narIdor],
      narrativesByVector: { IDOR: [narIdor], BAC: [narBac], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [asmBac, asmIdor],
      assembliesByVector: { IDOR: [asmIdor], BAC: [asmBac], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const result = mapper.mapEvidence(narInventory, assemblyInventory);

    expect(result.mapsByVector.IDOR.length).toBe(1);
    expect(result.mapsByVector.BAC.length).toBe(1);
    expect(result.mapsByVector.IDOR[0].evidenceMapId).toBe('evmap_nar_idor');
    expect(result.mapsByVector.BAC[0].evidenceMapId).toBe('evmap_nar_bac');
  });

  test('5. Missing assembly handling ignores narrative gracefully', () => {
    const nar = createMockNarrative({
      id: 'nar_1',
      candidateId: 'fc_1',
      assemblyId: 'missing_assembly_id',
      family: '/rest/basket/:basketId'
    });

    const narInventory: FindingNarrativeInventory = {
      narratives: [nar],
      narrativesByVector: { IDOR: [nar], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [], // empty assemblies
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const result = mapper.mapEvidence(narInventory, assemblyInventory);
    expect(result.maps.length).toBe(0);
  });

  test('6. Deterministic alphabetical ordering of maps inventory', () => {
    const nar1 = createMockNarrative({
      id: 'nar_B',
      candidateId: 'fc_B',
      assemblyId: 'asm_B',
      family: '/rest/basket'
    });
    const nar2 = createMockNarrative({
      id: 'nar_A',
      candidateId: 'fc_A',
      assemblyId: 'asm_A',
      family: '/rest/basket'
    });
    const asm1 = createMockAssembly({
      id: 'asm_A',
      family: '/rest/basket'
    });
    const asm2 = createMockAssembly({
      id: 'asm_B',
      family: '/rest/basket'
    });

    const narInventoryA: FindingNarrativeInventory = {
      narratives: [nar1, nar2],
      narrativesByVector: { IDOR: [nar1, nar2], BAC: [], TENANT_ISOLATION: [] }
    };

    const narInventoryB: FindingNarrativeInventory = {
      narratives: [nar2, nar1], // reverse list order
      narrativesByVector: { IDOR: [nar1, nar2], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [asm1, asm2],
      assembliesByVector: { IDOR: [asm1, asm2], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const resA = mapper.mapEvidence(narInventoryA, assemblyInventory);
    const resB = mapper.mapEvidence(narInventoryB, assemblyInventory);

    expect(resA.maps[0].evidenceMapId).toBe('evmap_nar_A');
    expect(resA.maps[1].evidenceMapId).toBe('evmap_nar_B');
    expect(resB.maps[0].evidenceMapId).toBe('evmap_nar_A');
    expect(resB.maps[1].evidenceMapId).toBe('evmap_nar_B');
  });

  test('7. Stable serialization yields byte-identical representation', () => {
    const nar1 = createMockNarrative({
      id: 'nar_B',
      candidateId: 'fc_B',
      assemblyId: 'asm_B',
      family: '/rest/basket'
    });
    const nar2 = createMockNarrative({
      id: 'nar_A',
      candidateId: 'fc_A',
      assemblyId: 'asm_A',
      family: '/rest/basket'
    });
    const asm1 = createMockAssembly({
      id: 'asm_A',
      family: '/rest/basket'
    });
    const asm2 = createMockAssembly({
      id: 'asm_B',
      family: '/rest/basket'
    });

    const narInventoryA: FindingNarrativeInventory = {
      narratives: [nar1, nar2],
      narrativesByVector: { IDOR: [nar1, nar2], BAC: [], TENANT_ISOLATION: [] }
    };

    const narInventoryB: FindingNarrativeInventory = {
      narratives: [nar2, nar1],
      narrativesByVector: { IDOR: [nar1, nar2], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [asm1, asm2],
      assembliesByVector: { IDOR: [asm1, asm2], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const resA = mapper.mapEvidence(narInventoryA, assemblyInventory);
    const resB = mapper.mapEvidence(narInventoryB, assemblyInventory);

    expect(JSON.stringify(resA)).toBe(JSON.stringify(resB));
  });

  test('8. Frozen outputs to satisfy immutability', () => {
    const nar = createMockNarrative({
      id: 'nar_1',
      candidateId: 'fc_1',
      assemblyId: 'asm_1',
      family: '/rest/basket/:basketId'
    });
    const asm = createMockAssembly({
      id: 'asm_1',
      family: '/rest/basket/:basketId'
    });

    const narInventory: FindingNarrativeInventory = {
      narratives: [nar],
      narrativesByVector: { IDOR: [nar], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [asm],
      assembliesByVector: { IDOR: [asm], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const result = mapper.mapEvidence(narInventory, assemblyInventory);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.maps)).toBe(true);
    expect(Object.isFrozen(result.mapsByVector)).toBe(true);
    expect(Object.isFrozen(result.maps[0])).toBe(true);
    expect(Object.isFrozen(result.maps[0].evidence)).toBe(true);
  });

  test('9. Empty inventory handling returns empty structures', () => {
    const narInventory = { narratives: [], narrativesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] } };
    const assemblyInventory = { assemblies: [], assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }, assembliesBySubject: {}, assembliesByResource: {} };

    const result = mapper.mapEvidence(narInventory, assemblyInventory);
    expect(result.maps.length).toBe(0);
    expect(result.mapsByVector.IDOR.length).toBe(0);
  });

  test('10. No duplication occurs even if duplicate narratives are processed', () => {
    const nar = createMockNarrative({
      id: 'nar_1',
      candidateId: 'fc_1',
      assemblyId: 'asm_1',
      family: '/rest/basket/:basketId'
    });
    const asm = createMockAssembly({
      id: 'asm_1',
      family: '/rest/basket/:basketId'
    });

    const narInventory: FindingNarrativeInventory = {
      narratives: [nar, nar], // duplicate narratives
      narrativesByVector: { IDOR: [nar], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [asm],
      assembliesByVector: { IDOR: [asm], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const result = mapper.mapEvidence(narInventory, assemblyInventory);
    expect(result.maps.length).toBe(1);
  });
});
