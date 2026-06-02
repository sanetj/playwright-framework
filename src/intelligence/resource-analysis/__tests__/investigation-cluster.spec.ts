import { test, expect } from '@playwright/test';
import { InvestigationClusterer } from '../investigation-clusterer';
import { InvestigationAssembly, InvestigationAssemblyInventory } from '../investigation-assembly';

function createMockAssembly(data: {
  id: string;
  vector?: 'IDOR' | 'BAC' | 'TENANT_ISOLATION';
  subject: string;
  owner: string;
  resourceKey: string;
  family: string;
  concreteId: string;
  surface?: string;
}): InvestigationAssembly {
  return {
    assemblyId: data.id,
    vector: data.vector || 'IDOR',
    subjectId: data.subject,
    ownerId: data.owner,
    resourceInstanceKey: data.resourceKey,
    targetResourceFamily: data.family,
    targetResourceId: data.concreteId,
    authorizationSurface: data.surface || 'General Surface',
    authorizationPairId: `pair_${data.id}`,
    replayCandidateId: `cand_${data.id}`,
    blueprintId: `bp_${data.id}`,
    baselineExchangeId: `ex_${data.id}`
  };
}

test.describe('Phase 10.6 — Investigation Clustering Unit Tests', () => {
  let clusterer: InvestigationClusterer;

  test.beforeEach(() => {
    clusterer = new InvestigationClusterer();
  });

  test('1. Cluster formation by vector/resource/surface groups correct assemblies', () => {
    const asm1 = createMockAssembly({
      id: 'asm_IDOR_usr1_basket::1',
      subject: 'usr1',
      owner: 'usr2',
      resourceKey: '/rest/basket/1',
      family: '/rest/basket',
      concreteId: '1',
      surface: 'Basket Surface'
    });
    const asm2 = createMockAssembly({
      id: 'asm_IDOR_usr3_basket::2',
      subject: 'usr3',
      owner: 'usr4',
      resourceKey: '/rest/basket/2',
      family: '/rest/basket',
      concreteId: '2',
      surface: 'Basket Surface'
    });

    const inventory: InvestigationAssemblyInventory = {
      assemblies: [asm1, asm2],
      assembliesByVector: { IDOR: [asm1, asm2], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: { usr1: [asm1], usr3: [asm2] },
      assembliesByResource: { '/rest/basket/1': [asm1], '/rest/basket/2': [asm2] }
    };

    const result = clusterer.clusterAssemblies(inventory);

    expect(result.clusters.length).toBe(1);
    const cl = result.clusters[0];
    expect(cl.clusterId).toBe('clst_IDOR_rest_basket_basket_surface');
    expect(cl.dimensions.vector).toBe('IDOR');
    expect(cl.dimensions.targetResourceFamily).toBe('/rest/basket');
    expect(cl.dimensions.authorizationSurface).toBe('Basket Surface');
    expect(cl.assemblyIds).toEqual(['asm_IDOR_usr1_basket::1', 'asm_IDOR_usr3_basket::2']);
  });

  test('2. Separation of different vectors puts assemblies in separate clusters', () => {
    const asmIdor = createMockAssembly({
      id: 'asm_IDOR_usr1_basket::1',
      vector: 'IDOR',
      subject: 'usr1',
      owner: 'usr2',
      resourceKey: '/rest/basket/1',
      family: '/rest/basket',
      concreteId: '1',
      surface: 'Basket Surface'
    });
    const asmBac = createMockAssembly({
      id: 'asm_BAC_usr1_basket::1',
      vector: 'BAC',
      subject: 'usr1',
      owner: 'usr2',
      resourceKey: '/rest/basket/1',
      family: '/rest/basket',
      concreteId: '1',
      surface: 'Basket Surface'
    });

    const inventory: InvestigationAssemblyInventory = {
      assemblies: [asmIdor, asmBac],
      assembliesByVector: { IDOR: [asmIdor], BAC: [asmBac], TENANT_ISOLATION: [] },
      assembliesBySubject: { usr1: [asmIdor, asmBac] },
      assembliesByResource: { '/rest/basket/1': [asmIdor, asmBac] }
    };

    const result = clusterer.clusterAssemblies(inventory);

    expect(result.clusters.length).toBe(2);
    expect(result.clusters[0].clusterId).toContain('BAC');
    expect(result.clusters[1].clusterId).toContain('IDOR');
  });

  test('3. Separation of different surfaces puts assemblies in separate clusters', () => {
    const asm1 = createMockAssembly({
      id: 'asm_IDOR_usr1_basket::1',
      subject: 'usr1',
      owner: 'usr2',
      resourceKey: '/rest/basket/1',
      family: '/rest/basket',
      concreteId: '1',
      surface: 'API Surface'
    });
    const asm2 = createMockAssembly({
      id: 'asm_IDOR_usr1_basket::2',
      subject: 'usr1',
      owner: 'usr2',
      resourceKey: '/rest/basket/2',
      family: '/rest/basket',
      concreteId: '2',
      surface: 'Web UI Surface'
    });

    const inventory: InvestigationAssemblyInventory = {
      assemblies: [asm1, asm2],
      assembliesByVector: { IDOR: [asm1, asm2], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: { usr1: [asm1, asm2] },
      assembliesByResource: { '/rest/basket/1': [asm1], '/rest/basket/2': [asm2] }
    };

    const result = clusterer.clusterAssemblies(inventory);

    expect(result.clusters.length).toBe(2);
    expect(result.clusters[0].dimensions.authorizationSurface).toBe('API Surface');
    expect(result.clusters[1].dimensions.authorizationSurface).toBe('Web UI Surface');
  });

  test('4. Deduplication of duplicate assembly entries prevents redundant listing', () => {
    const asm = createMockAssembly({
      id: 'asm_IDOR_usr1_basket::1',
      subject: 'usr1',
      owner: 'usr2',
      resourceKey: '/rest/basket/1',
      family: '/rest/basket',
      concreteId: '1',
      surface: 'Basket Surface'
    });

    const inventory: InvestigationAssemblyInventory = {
      assemblies: [asm, asm],
      assembliesByVector: { IDOR: [asm], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: { usr1: [asm] },
      assembliesByResource: { '/rest/basket/1': [asm] }
    };

    const result = clusterer.clusterAssemblies(inventory);
    expect(result.clusters.length).toBe(1);
    expect(result.clusters[0].assemblyIds.length).toBe(1);
  });

  test('5. Deterministic ordering of clusters and assemblies', () => {
    const asm1 = createMockAssembly({
      id: 'asm_IDOR_usrA_basket::1',
      subject: 'usrA',
      owner: 'usrB',
      resourceKey: '/rest/basket/1',
      family: '/rest/basket',
      concreteId: '1'
    });
    const asm2 = createMockAssembly({
      id: 'asm_IDOR_usrC_basket::2',
      subject: 'usrC',
      owner: 'usrD',
      resourceKey: '/rest/basket/2',
      family: '/rest/basket',
      concreteId: '2'
    });

    const inventoryA: InvestigationAssemblyInventory = {
      assemblies: [asm1, asm2],
      assembliesByVector: { IDOR: [asm1, asm2], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: { usrA: [asm1], usrC: [asm2] },
      assembliesByResource: { '/rest/basket/1': [asm1], '/rest/basket/2': [asm2] }
    };

    const inventoryB: InvestigationAssemblyInventory = {
      assemblies: [asm2, asm1], // reverse list order
      assembliesByVector: { IDOR: [asm1, asm2], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: { usrA: [asm1], usrC: [asm2] },
      assembliesByResource: { '/rest/basket/1': [asm1], '/rest/basket/2': [asm2] }
    };

    const res1 = clusterer.clusterAssemblies(inventoryA);
    const res2 = clusterer.clusterAssemblies(inventoryB);

    expect(res1.clusters[0].assemblyIds).toEqual(['asm_IDOR_usrA_basket::1', 'asm_IDOR_usrC_basket::2']);
    expect(res2.clusters[0].assemblyIds).toEqual(['asm_IDOR_usrA_basket::1', 'asm_IDOR_usrC_basket::2']);
  });

  test('6. Stable serialization yields byte-identical output representations', () => {
    const asm1 = createMockAssembly({
      id: 'asm_IDOR_usrA_basket::1',
      subject: 'usrA',
      owner: 'usrB',
      resourceKey: '/rest/basket/1',
      family: '/rest/basket',
      concreteId: '1'
    });
    const asm2 = createMockAssembly({
      id: 'asm_IDOR_usrC_basket::2',
      subject: 'usrC',
      owner: 'usrD',
      resourceKey: '/rest/basket/2',
      family: '/rest/basket',
      concreteId: '2'
    });

    const inventoryA: InvestigationAssemblyInventory = {
      assemblies: [asm1, asm2],
      assembliesByVector: { IDOR: [asm1, asm2], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: { usrA: [asm1], usrC: [asm2] },
      assembliesByResource: { '/rest/basket/1': [asm1], '/rest/basket/2': [asm2] }
    };

    const inventoryB: InvestigationAssemblyInventory = {
      assemblies: [asm2, asm1],
      assembliesByVector: { IDOR: [asm1, asm2], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: { usrA: [asm1], usrC: [asm2] },
      assembliesByResource: { '/rest/basket/1': [asm1], '/rest/basket/2': [asm2] }
    };

    const resA = clusterer.clusterAssemblies(inventoryA);
    const resB = clusterer.clusterAssemblies(inventoryB);

    expect(JSON.stringify(resA)).toBe(JSON.stringify(resB));
  });

  test('7. Frozen outputs to satisfy immutability requirements', () => {
    const asm = createMockAssembly({
      id: 'asm_IDOR_usr1_basket::1',
      subject: 'usr1',
      owner: 'usr2',
      resourceKey: '/rest/basket/1',
      family: '/rest/basket',
      concreteId: '1'
    });

    const inventory: InvestigationAssemblyInventory = {
      assemblies: [asm],
      assembliesByVector: { IDOR: [asm], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: { usr1: [asm] },
      assembliesByResource: { '/rest/basket/1': [asm] }
    };

    const result = clusterer.clusterAssemblies(inventory);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.clusters)).toBe(true);
    expect(Object.isFrozen(result.clustersByVector)).toBe(true);
    expect(Object.isFrozen(result.clustersByResourceFamily)).toBe(true);
    expect(Object.isFrozen(result.clusters[0])).toBe(true);
    expect(Object.isFrozen(result.clusters[0].assemblyIds)).toBe(true);
  });

  test('8. Empty inventory handling returns empty structures', () => {
    const inventory: InvestigationAssemblyInventory = {
      assemblies: [],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const result = clusterer.clusterAssemblies(inventory);

    expect(result.clusters.length).toBe(0);
    expect(result.clustersByVector.IDOR.length).toBe(0);
    expect(result.clustersByVector.BAC.length).toBe(0);
    expect(result.clustersByVector.TENANT_ISOLATION.length).toBe(0);
    expect(Object.keys(result.clustersByResourceFamily).length).toBe(0);
  });

  test('9. No timestamps are added to the output structure', () => {
    const inventory: InvestigationAssemblyInventory = {
      assemblies: [],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const result = clusterer.clusterAssemblies(inventory);
    expect((result as any).timestamp).toBeUndefined();
    expect((result as any).generatedAt).toBeUndefined();
  });

  test('10. No randomness is used inside the output clusterId or objects', () => {
    const asm = createMockAssembly({
      id: 'asm_IDOR_usr1_basket::1',
      subject: 'usr1',
      owner: 'usr2',
      resourceKey: '/rest/basket/1',
      family: '/rest/basket',
      concreteId: '1'
    });

    const inventory: InvestigationAssemblyInventory = {
      assemblies: [asm],
      assembliesByVector: { IDOR: [asm], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: { usr1: [asm] },
      assembliesByResource: { '/rest/basket/1': [asm] }
    };

    const result = clusterer.clusterAssemblies(inventory);
    expect(result.clusters[0].clusterId).toBe('clst_IDOR_rest_basket_general_surface');
  });
});
