import { test, expect } from '@playwright/test';
import { BundleAssembler } from '../bundle-assembler';
import { FindingCandidateInventory, FindingCandidate } from '../finding-candidate';
import { FindingNarrativeInventory, FindingNarrative } from '../finding-narrative';
import { EvidenceMapInventory, FindingEvidenceMap } from '../finding-evidence-map';

function createMockCandidate(id: string, vector: 'IDOR' | 'BAC' | 'TENANT_ISOLATION' = 'IDOR'): FindingCandidate {
  return {
    candidateId: id,
    vector,
    targetResourceFamily: '/rest/basket/:basketId',
    authorizationSurface: 'Basket Surface',
    clusterIds: [`cluster_${id}`],
    assemblyIds: [`asm_${id}`]
  };
}

function createMockNarrative(id: string, candidateId: string, assemblyId: string, vector: 'IDOR' | 'BAC' | 'TENANT_ISOLATION' = 'IDOR'): FindingNarrative {
  return {
    narrativeId: id,
    candidateId,
    assemblyId,
    vector,
    targetResourceFamily: '/rest/basket/:basketId',
    authorizationSurface: 'Basket Surface',
    facts: {
      subjectId: 'usr_13',
      ownerId: 'usr_12',
      httpMethod: 'GET'
    },
    fragments: []
  };
}

function createMockEvidenceMap(id: string, narrativeId: string, candidateId: string, assemblyId: string, vector: 'IDOR' | 'BAC' | 'TENANT_ISOLATION' = 'IDOR'): FindingEvidenceMap {
  return {
    evidenceMapId: id,
    narrativeId,
    candidateId,
    vector,
    targetResourceFamily: '/rest/basket/:basketId',
    authorizationSurface: 'Basket Surface',
    evidence: {
      assemblyId
    }
  };
}

function createCandidateInventory(candidates: FindingCandidate[]): FindingCandidateInventory {
  return {
    candidates,
    candidatesByVector: {
      IDOR: candidates.filter(c => c.vector === 'IDOR'),
      BAC: candidates.filter(c => c.vector === 'BAC'),
      TENANT_ISOLATION: candidates.filter(c => c.vector === 'TENANT_ISOLATION')
    }
  };
}

test.describe('Phase 10.10 — Bundle Assembler Unit Tests', () => {
  let assembler: BundleAssembler;

  test.beforeEach(() => {
    assembler = new BundleAssembler();
  });

  test('1. Bundle creation produces structured InvestigationBundle fields', () => {
    const cand = createMockCandidate('fc_1');
    const nar = createMockNarrative('nar_1', 'fc_1', 'asm_1');
    const map = createMockEvidenceMap('evmap_nar_1', 'nar_1', 'fc_1', 'asm_1');

    const candInv = createCandidateInventory([cand]);
    const narInv: FindingNarrativeInventory = {
      narratives: [nar],
      narrativesByVector: { IDOR: [nar], BAC: [], TENANT_ISOLATION: [] }
    };
    const mapInv: EvidenceMapInventory = {
      maps: [map],
      mapsByVector: { IDOR: [map], BAC: [], TENANT_ISOLATION: [] }
    };

    const result = assembler.assemble(candInv, narInv, mapInv);

    expect(result.bundles.length).toBe(1);
    const bundle = result.bundles[0];
    expect(bundle.bundleId).toBe('bundle_fc_1');
    expect(bundle.candidateId).toBe('fc_1');
    expect(bundle.narrativeId).toBe('nar_1');
    expect(bundle.evidenceMapId).toBe('evmap_nar_1');
    expect(bundle.assemblyId).toBe('asm_1');
    expect(bundle.vector).toBe('IDOR');
    expect(bundle.targetResourceFamily).toBe('/rest/basket/:basketId');
    expect(bundle.authorizationSurface).toBe('Basket Surface');
  });

  test('2. Candidate verification skips maps with missing candidate', () => {
    const nar = createMockNarrative('nar_1', 'fc_1', 'asm_1');
    const map = createMockEvidenceMap('evmap_nar_1', 'nar_1', 'fc_1', 'asm_1');

    const candInv = createCandidateInventory([]); // missing candidate
    const narInv: FindingNarrativeInventory = {
      narratives: [nar],
      narrativesByVector: { IDOR: [nar], BAC: [], TENANT_ISOLATION: [] }
    };
    const mapInv: EvidenceMapInventory = {
      maps: [map],
      mapsByVector: { IDOR: [map], BAC: [], TENANT_ISOLATION: [] }
    };

    const result = assembler.assemble(candInv, narInv, mapInv);
    expect(result.bundles.length).toBe(0);
  });

  test('3. Narrative verification skips maps with missing narrative', () => {
    const cand = createMockCandidate('fc_1');
    const map = createMockEvidenceMap('evmap_nar_1', 'nar_1', 'fc_1', 'asm_1');

    const candInv = createCandidateInventory([cand]);
    const narInv: FindingNarrativeInventory = {
      narratives: [], // missing narrative
      narrativesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };
    const mapInv: EvidenceMapInventory = {
      maps: [map],
      mapsByVector: { IDOR: [map], BAC: [], TENANT_ISOLATION: [] }
    };

    const result = assembler.assemble(candInv, narInv, mapInv);
    expect(result.bundles.length).toBe(0);
  });

  test('4. EvidenceMap verification aggregates only from evidence maps', () => {
    const cand = createMockCandidate('fc_1');
    const nar = createMockNarrative('nar_1', 'fc_1', 'asm_1');

    const candInv = createCandidateInventory([cand]);
    const narInv: FindingNarrativeInventory = {
      narratives: [nar],
      narrativesByVector: { IDOR: [nar], BAC: [], TENANT_ISOLATION: [] }
    };
    const mapInv: EvidenceMapInventory = {
      maps: [], // empty maps
      mapsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const result = assembler.assemble(candInv, narInv, mapInv);
    expect(result.bundles.length).toBe(0);
  });

  test('5. Duplicate candidate prevention processes only the earliest candidate map', () => {
    const cand = createMockCandidate('fc_1');
    const nar1 = createMockNarrative('nar_1', 'fc_1', 'asm_1');
    const nar2 = createMockNarrative('nar_2', 'fc_1', 'asm_2');
    const map1 = createMockEvidenceMap('evmap_nar_1', 'nar_1', 'fc_1', 'asm_1');
    const map2 = createMockEvidenceMap('evmap_nar_2', 'nar_2', 'fc_1', 'asm_2');

    const candInv = createCandidateInventory([cand]);
    const narInv: FindingNarrativeInventory = {
      narratives: [nar1, nar2],
      narrativesByVector: { IDOR: [nar1, nar2], BAC: [], TENANT_ISOLATION: [] }
    };
    const mapInv: EvidenceMapInventory = {
      maps: [map1, map2],
      mapsByVector: { IDOR: [map1, map2], BAC: [], TENANT_ISOLATION: [] }
    };

    const result = assembler.assemble(candInv, narInv, mapInv);
    expect(result.bundles.length).toBe(1);
    expect(result.bundles[0].assemblyId).toBe('asm_1'); // earliest reference resolved
  });

  test('6. bundlesByVector groups bundles correctly by vector', () => {
    const candIdor = createMockCandidate('fc_idor', 'IDOR');
    const candBac = createMockCandidate('fc_bac', 'BAC');
    const narIdor = createMockNarrative('nar_idor', 'fc_idor', 'asm_idor', 'IDOR');
    const narBac = createMockNarrative('nar_bac', 'fc_bac', 'asm_bac', 'BAC');
    const mapIdor = createMockEvidenceMap('evmap_idor', 'nar_idor', 'fc_idor', 'asm_idor', 'IDOR');
    const mapBac = createMockEvidenceMap('evmap_bac', 'nar_bac', 'fc_bac', 'asm_bac', 'BAC');

    const candInv = createCandidateInventory([candIdor, candBac]);
    const narInv: FindingNarrativeInventory = {
      narratives: [narIdor, narBac],
      narrativesByVector: { IDOR: [narIdor], BAC: [narBac], TENANT_ISOLATION: [] }
    };
    const mapInv: EvidenceMapInventory = {
      maps: [mapIdor, mapBac],
      mapsByVector: { IDOR: [mapIdor], BAC: [mapBac], TENANT_ISOLATION: [] }
    };

    const result = assembler.assemble(candInv, narInv, mapInv);
    expect(result.bundlesByVector.IDOR.length).toBe(1);
    expect(result.bundlesByVector.BAC.length).toBe(1);
    expect(result.bundlesByVector.IDOR[0].bundleId).toBe('bundle_fc_idor');
    expect(result.bundlesByVector.BAC[0].bundleId).toBe('bundle_fc_bac');
  });

  test('7. Deterministic alphabetical ordering of bundles inventory', () => {
    const candB = createMockCandidate('fc_B');
    const candA = createMockCandidate('fc_A');
    const narB = createMockNarrative('nar_B', 'fc_B', 'asm_B');
    const narA = createMockNarrative('nar_A', 'fc_A', 'asm_A');
    const mapB = createMockEvidenceMap('evmap_nar_B', 'nar_B', 'fc_B', 'asm_B');
    const mapA = createMockEvidenceMap('evmap_nar_A', 'nar_A', 'fc_A', 'asm_A');

    const candInv = createCandidateInventory([candB, candA]);
    const narInv: FindingNarrativeInventory = {
      narratives: [narB, narA],
      narrativesByVector: { IDOR: [narB, narA], BAC: [], TENANT_ISOLATION: [] }
    };

    const mapInvA: EvidenceMapInventory = {
      maps: [mapB, mapA],
      mapsByVector: { IDOR: [mapB, mapA], BAC: [], TENANT_ISOLATION: [] }
    };

    const mapInvB: EvidenceMapInventory = {
      maps: [mapA, mapB],
      mapsByVector: { IDOR: [mapA, mapB], BAC: [], TENANT_ISOLATION: [] }
    };

    const resA = assembler.assemble(candInv, narInv, mapInvA);
    const resB = assembler.assemble(candInv, narInv, mapInvB);

    expect(resA.bundles[0].bundleId).toBe('bundle_fc_A');
    expect(resA.bundles[1].bundleId).toBe('bundle_fc_B');
    expect(resB.bundles[0].bundleId).toBe('bundle_fc_A');
    expect(resB.bundles[1].bundleId).toBe('bundle_fc_B');
  });

  test('8. Stable serialization yields byte-identical representation', () => {
    const candB = createMockCandidate('fc_B');
    const candA = createMockCandidate('fc_A');
    const narB = createMockNarrative('nar_B', 'fc_B', 'asm_B');
    const narA = createMockNarrative('nar_A', 'fc_A', 'asm_A');
    const mapB = createMockEvidenceMap('evmap_nar_B', 'nar_B', 'fc_B', 'asm_B');
    const mapA = createMockEvidenceMap('evmap_nar_A', 'nar_A', 'fc_A', 'asm_A');

    const candInv = createCandidateInventory([candB, candA]);
    const narInv: FindingNarrativeInventory = {
      narratives: [narB, narA],
      narrativesByVector: { IDOR: [narB, narA], BAC: [], TENANT_ISOLATION: [] }
    };

    const mapInvA: EvidenceMapInventory = {
      maps: [mapB, mapA],
      mapsByVector: { IDOR: [mapB, mapA], BAC: [], TENANT_ISOLATION: [] }
    };

    const mapInvB: EvidenceMapInventory = {
      maps: [mapA, mapB],
      mapsByVector: { IDOR: [mapA, mapB], BAC: [], TENANT_ISOLATION: [] }
    };

    const resA = assembler.assemble(candInv, narInv, mapInvA);
    const resB = assembler.assemble(candInv, narInv, mapInvB);

    expect(JSON.stringify(resA)).toBe(JSON.stringify(resB));
  });

  test('9. Frozen outputs to satisfy immutability', () => {
    const cand = createMockCandidate('fc_1');
    const nar = createMockNarrative('nar_1', 'fc_1', 'asm_1');
    const map = createMockEvidenceMap('evmap_nar_1', 'nar_1', 'fc_1', 'asm_1');

    const candInv = createCandidateInventory([cand]);
    const narInv: FindingNarrativeInventory = {
      narratives: [nar],
      narrativesByVector: { IDOR: [nar], BAC: [], TENANT_ISOLATION: [] }
    };
    const mapInv: EvidenceMapInventory = {
      maps: [map],
      mapsByVector: { IDOR: [map], BAC: [], TENANT_ISOLATION: [] }
    };

    const result = assembler.assemble(candInv, narInv, mapInv);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.bundles)).toBe(true);
    expect(Object.isFrozen(result.bundlesByVector)).toBe(true);
    expect(Object.isFrozen(result.bundles[0])).toBe(true);
  });

  test('10. Empty inventory handling returns empty structures', () => {
    const candInv = createCandidateInventory([]);
    const narInv = { narratives: [], narrativesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] } };
    const mapInv = { maps: [], mapsByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] } };

    const result = assembler.assemble(candInv, narInv, mapInv);
    expect(result.bundles.length).toBe(0);
    expect(result.bundlesByVector.IDOR.length).toBe(0);
  });

  test('11. Missing reference handling ignores incomplete paths', () => {
    const cand = createMockCandidate('fc_1');
    const nar = createMockNarrative('nar_1', 'fc_1', 'asm_1');
    const mapOrphanCand = createMockEvidenceMap('evmap_nar_1', 'nar_1', 'fc_missing', 'asm_1');
    const mapOrphanNar = createMockEvidenceMap('evmap_nar_missing', 'nar_missing', 'fc_1', 'asm_1');

    const candInv = createCandidateInventory([cand]);
    const narInv: FindingNarrativeInventory = {
      narratives: [nar],
      narrativesByVector: { IDOR: [nar], BAC: [], TENANT_ISOLATION: [] }
    };

    const mapInv1: EvidenceMapInventory = {
      maps: [mapOrphanCand],
      mapsByVector: { IDOR: [mapOrphanCand], BAC: [], TENANT_ISOLATION: [] }
    };
    const mapInv2: EvidenceMapInventory = {
      maps: [mapOrphanNar],
      mapsByVector: { IDOR: [mapOrphanNar], BAC: [], TENANT_ISOLATION: [] }
    };

    expect(assembler.assemble(candInv, narInv, mapInv1).bundles.length).toBe(0);
    expect(assembler.assemble(candInv, narInv, mapInv2).bundles.length).toBe(0);
  });

  test('12. One candidate -> one bundle invariant is strictly preserved', () => {
    const cand = createMockCandidate('fc_1');
    const nar1 = createMockNarrative('nar_1', 'fc_1', 'asm_1');
    const nar2 = createMockNarrative('nar_2', 'fc_1', 'asm_2');
    const map1 = createMockEvidenceMap('evmap_nar_1', 'nar_1', 'fc_1', 'asm_1');
    const map2 = createMockEvidenceMap('evmap_nar_2', 'nar_2', 'fc_1', 'asm_2');

    const candInv = createCandidateInventory([cand]);
    const narInv: FindingNarrativeInventory = {
      narratives: [nar1, nar2],
      narrativesByVector: { IDOR: [nar1, nar2], BAC: [], TENANT_ISOLATION: [] }
    };
    const mapInv: EvidenceMapInventory = {
      maps: [map1, map2, map1, map2], // duplicate entries
      mapsByVector: { IDOR: [map1, map2], BAC: [], TENANT_ISOLATION: [] }
    };

    const result = assembler.assemble(candInv, narInv, mapInv);
    expect(result.bundles.length).toBe(1); // exactly one bundle for fc_1
  });
});
