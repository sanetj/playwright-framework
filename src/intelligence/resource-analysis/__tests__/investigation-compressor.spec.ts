import { test, expect } from '@playwright/test';
import { InvestigationCompressor } from '../investigation-compressor';
import { InvestigationCluster, InvestigationClusterInventory } from '../investigation-cluster';

function createMockCluster(data: {
  id: string;
  vector?: 'IDOR' | 'BAC' | 'TENANT_ISOLATION';
  family: string;
  surface?: string;
  assemblies: string[];
}): InvestigationCluster {
  return {
    clusterId: data.id,
    dimensions: {
      vector: data.vector || 'IDOR',
      targetResourceFamily: data.family,
      authorizationSurface: data.surface || 'General Surface'
    },
    assemblyIds: data.assemblies
  };
}

test.describe('Phase 10.7 — Investigation Compression 1:1 Unit Tests', () => {
  let compressor: InvestigationCompressor;

  test.beforeEach(() => {
    compressor = new InvestigationCompressor();
  });

  test('1. Compression maps clusters 1:1 to finding candidates without path truncation or merging', () => {
    const cl1 = createMockCluster({
      id: 'clst_IDOR_rest_basket_basketId_general_surface',
      family: '/rest/basket/:basketId',
      assemblies: ['asm1']
    });
    const cl2 = createMockCluster({
      id: 'clst_IDOR_rest_basket_general_surface',
      family: '/rest/basket',
      assemblies: ['asm2']
    });

    const inventory: InvestigationClusterInventory = {
      clusters: [cl1, cl2],
      clustersByVector: { IDOR: [cl1, cl2], BAC: [], TENANT_ISOLATION: [] },
      clustersByResourceFamily: { '/rest/basket/:basketId': [cl1], '/rest/basket': [cl2] }
    };

    const result = compressor.compressClusters(inventory);

    expect(result.candidates.length).toBe(2);
    const cand1 = result.candidates[0];
    const cand2 = result.candidates[1];

    expect(cand1.candidateId).toBe('fc_IDOR_rest_basket_basketId_general_surface');
    expect(cand1.targetResourceFamily).toBe('/rest/basket/:basketId');
    expect(cand1.clusterIds).toEqual(['clst_IDOR_rest_basket_basketId_general_surface']);
    expect(cand1.assemblyIds).toEqual(['asm1']);

    expect(cand2.candidateId).toBe('fc_IDOR_rest_basket_general_surface');
    expect(cand2.targetResourceFamily).toBe('/rest/basket');
    expect(cand2.clusterIds).toEqual(['clst_IDOR_rest_basket_general_surface']);
    expect(cand2.assemblyIds).toEqual(['asm2']);
  });

  test('2. Separation of different vectors puts findings in separate vector indices', () => {
    const clIdor = createMockCluster({
      id: 'clst_IDOR_rest_basket_basketId_general_surface',
      vector: 'IDOR',
      family: '/rest/basket/:basketId',
      assemblies: ['asm1']
    });
    const clBac = createMockCluster({
      id: 'clst_BAC_rest_basket_basketId_general_surface',
      vector: 'BAC',
      family: '/rest/basket/:basketId',
      assemblies: ['asm2']
    });

    const inventory: InvestigationClusterInventory = {
      clusters: [clIdor, clBac],
      clustersByVector: { IDOR: [clIdor], BAC: [clBac], TENANT_ISOLATION: [] },
      clustersByResourceFamily: { '/rest/basket/:basketId': [clIdor, clBac] }
    };

    const result = compressor.compressClusters(inventory);

    expect(result.candidates.length).toBe(2);
    expect(result.candidatesByVector.IDOR.length).toBe(1);
    expect(result.candidatesByVector.BAC.length).toBe(1);
    expect(result.candidatesByVector.IDOR[0].candidateId).toContain('IDOR');
    expect(result.candidatesByVector.BAC[0].candidateId).toContain('BAC');
  });

  test('3. Separation of different surfaces puts findings in separate candidates', () => {
    const cl1 = createMockCluster({
      id: 'clst_IDOR_rest_basket_api_surface',
      family: '/rest/basket',
      surface: 'API Surface',
      assemblies: ['asm1']
    });
    const cl2 = createMockCluster({
      id: 'clst_IDOR_rest_basket_ui_surface',
      family: '/rest/basket',
      surface: 'UI Surface',
      assemblies: ['asm2']
    });

    const inventory: InvestigationClusterInventory = {
      clusters: [cl1, cl2],
      clustersByVector: { IDOR: [cl1, cl2], BAC: [], TENANT_ISOLATION: [] },
      clustersByResourceFamily: { '/rest/basket': [cl1, cl2] }
    };

    const result = compressor.compressClusters(inventory);

    expect(result.candidates.length).toBe(2);
    expect(result.candidates[0].authorizationSurface).toBe('API Surface');
    expect(result.candidates[1].authorizationSurface).toBe('UI Surface');
  });

  test('4. Deterministic assembly list sorting inside findings', () => {
    const cl = createMockCluster({
      id: 'clst_IDOR_rest_basket_general_surface',
      family: '/rest/basket',
      assemblies: ['asmC', 'asmA', 'asmB']
    });

    const inventory: InvestigationClusterInventory = {
      clusters: [cl],
      clustersByVector: { IDOR: [cl], BAC: [], TENANT_ISOLATION: [] },
      clustersByResourceFamily: { '/rest/basket': [cl] }
    };

    const result = compressor.compressClusters(inventory);
    expect(result.candidates[0].assemblyIds).toEqual(['asmA', 'asmB', 'asmC']);
  });

  test('5. Deterministic ordering of candidates list', () => {
    const cl1 = createMockCluster({
      id: 'clst_IDOR_rest_basket_basketId_general_surface',
      family: '/rest/basket/:basketId',
      assemblies: ['asm1']
    });
    const cl2 = createMockCluster({
      id: 'clst_IDOR_rest_basket_general_surface',
      family: '/rest/basket',
      assemblies: ['asm2']
    });

    const inventoryA: InvestigationClusterInventory = {
      clusters: [cl1, cl2],
      clustersByVector: { IDOR: [cl1, cl2], BAC: [], TENANT_ISOLATION: [] },
      clustersByResourceFamily: { '/rest/basket/:basketId': [cl1], '/rest/basket': [cl2] }
    };

    const inventoryB: InvestigationClusterInventory = {
      clusters: [cl2, cl1], // reverse list order
      clustersByVector: { IDOR: [cl1, cl2], BAC: [], TENANT_ISOLATION: [] },
      clustersByResourceFamily: { '/rest/basket/:basketId': [cl1], '/rest/basket': [cl2] }
    };

    const resA = compressor.compressClusters(inventoryA);
    const resB = compressor.compressClusters(inventoryB);

    expect(resA.candidates[0].candidateId).toBe('fc_IDOR_rest_basket_basketId_general_surface');
    expect(resA.candidates[1].candidateId).toBe('fc_IDOR_rest_basket_general_surface');
    expect(resB.candidates[0].candidateId).toBe('fc_IDOR_rest_basket_basketId_general_surface');
    expect(resB.candidates[1].candidateId).toBe('fc_IDOR_rest_basket_general_surface');
  });

  test('6. Stable serialization yields byte-identical representation', () => {
    const cl1 = createMockCluster({
      id: 'clst_IDOR_rest_basket_basketId_general_surface',
      family: '/rest/basket/:basketId',
      assemblies: ['asm1']
    });
    const cl2 = createMockCluster({
      id: 'clst_IDOR_rest_basket_general_surface',
      family: '/rest/basket',
      assemblies: ['asm2']
    });

    const inventoryA: InvestigationClusterInventory = {
      clusters: [cl1, cl2],
      clustersByVector: { IDOR: [cl1, cl2], BAC: [], TENANT_ISOLATION: [] },
      clustersByResourceFamily: { '/rest/basket/:basketId': [cl1], '/rest/basket': [cl2] }
    };

    const inventoryB: InvestigationClusterInventory = {
      clusters: [cl2, cl1],
      clustersByVector: { IDOR: [cl1, cl2], BAC: [], TENANT_ISOLATION: [] },
      clustersByResourceFamily: { '/rest/basket/:basketId': [cl1], '/rest/basket': [cl2] }
    };

    const resA = compressor.compressClusters(inventoryA);
    const resB = compressor.compressClusters(inventoryB);

    expect(JSON.stringify(resA)).toBe(JSON.stringify(resB));
  });

  test('7. Frozen outputs to satisfy immutability', () => {
    const cl = createMockCluster({
      id: 'clst_IDOR_rest_basket_general_surface',
      family: '/rest/basket',
      assemblies: ['asm1']
    });

    const inventory: InvestigationClusterInventory = {
      clusters: [cl],
      clustersByVector: { IDOR: [cl], BAC: [], TENANT_ISOLATION: [] },
      clustersByResourceFamily: { '/rest/basket': [cl] }
    };

    const result = compressor.compressClusters(inventory);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.candidates)).toBe(true);
    expect(Object.isFrozen(result.candidatesByVector)).toBe(true);
    expect(Object.isFrozen(result.candidates[0])).toBe(true);
    expect(Object.isFrozen(result.candidates[0].clusterIds)).toBe(true);
    expect(Object.isFrozen(result.candidates[0].assemblyIds)).toBe(true);
  });

  test('8. Empty inventory handling', () => {
    const inventory: InvestigationClusterInventory = {
      clusters: [],
      clustersByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      clustersByResourceFamily: {}
    };

    const result = compressor.compressClusters(inventory);
    expect(result.candidates.length).toBe(0);
    expect(result.candidatesByVector.IDOR.length).toBe(0);
  });

  test('9. No timestamps are added to output candidates', () => {
    const inventory: InvestigationClusterInventory = {
      clusters: [],
      clustersByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      clustersByResourceFamily: {}
    };

    const result = compressor.compressClusters(inventory);
    expect((result as any).timestamp).toBeUndefined();
    expect((result as any).generatedAt).toBeUndefined();
  });

  test('10. No randomness is used inside candidateId generation', () => {
    const cl = createMockCluster({
      id: 'clst_IDOR_rest_basket_general_surface',
      family: '/rest/basket',
      assemblies: ['asm1']
    });

    const inventory: InvestigationClusterInventory = {
      clusters: [cl],
      clustersByVector: { IDOR: [cl], BAC: [], TENANT_ISOLATION: [] },
      clustersByResourceFamily: { '/rest/basket': [cl] }
    };

    const result = compressor.compressClusters(inventory);
    expect(result.candidates[0].candidateId).toBe('fc_IDOR_rest_basket_general_surface');
  });
});
