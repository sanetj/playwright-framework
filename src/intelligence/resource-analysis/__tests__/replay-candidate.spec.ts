import { test, expect } from '@playwright/test';
import { ReplayCandidateSynthesizer } from '../replay-candidate-synthesizer';
import { ResourceSignalInventory, ResourceSignal } from '../resource-signal';

function createMockSignal(data: Partial<ResourceSignal>): ResourceSignal {
  return {
    resourceFamily: data.resourceFamily || '/api/resource',
    resourceSignature: data.resourceSignature || `GET::${data.resourceFamily || '/api/resource'}`,
    httpMethod: data.httpMethod || 'GET',
    primaryType: data.primaryType || 'DOCUMENT',
    investigationSignals: data.investigationSignals || [],
    authorizationSurface: data.authorizationSurface || 'General Surface',
    parameterSignature: data.parameterSignature || [],
    evidenceExchangeIds: data.evidenceExchangeIds || ['ex_baseline']
  };
}

test.describe('Phase 10.1B — Replay Candidate Synthesis Unit Tests', () => {
  let synthesizer: ReplayCandidateSynthesizer;

  test.beforeEach(() => {
    synthesizer = new ReplayCandidateSynthesizer();
  });

  test('1. IDOR candidate synthesis mapping', () => {
    const inventory: ResourceSignalInventory = {
      exportVersion: '1.0.0',
      signals: [
        createMockSignal({
          resourceFamily: '/rest/basket/:basketId',
          resourceSignature: 'GET::/rest/basket/:basketId',
          httpMethod: 'GET',
          primaryType: 'USER',
          investigationSignals: ['OBJECT_IDENTIFIER_PRESENT'],
          authorizationSurface: 'Basket Surface',
          parameterSignature: ['basketId', 'promoCode', 'userId'],
          evidenceExchangeIds: ['ex_basket_10', 'ex_basket_05']
        })
      ],
      signalsBySurface: {}
    };

    const result = synthesizer.synthesize(inventory);
    expect(result.candidates.length).toBe(1);

    const cand = result.candidates[0];
    expect(cand.candidateId).toBe('cand_IDOR_GET::/rest/basket/:basketId');
    expect(cand.targetVector).toBe('IDOR');
    expect(cand.baselineExchangeId).toBe('ex_basket_05'); // Sorted first alphabetically
    expect(cand.parameterTargets).toEqual(['basketId', 'userId']); // Filters keys containing ID
    expect(cand.headerTargets).toEqual(['cookie']);
    expect(cand.synthesisReasons).toEqual(['IDOR_PARAMETER_EXPOSED']);
  });

  test('2. BAC candidate synthesis mapping', () => {
    const inventory: ResourceSignalInventory = {
      exportVersion: '1.0.0',
      signals: [
        createMockSignal({
          resourceFamily: '/api/administration',
          resourceSignature: 'POST::/api/administration',
          httpMethod: 'POST',
          primaryType: 'DOCUMENT',
          investigationSignals: ['BOUNDARY_ADJACENT', 'CROSS_ROLE_VISIBLE'],
          authorizationSurface: 'Administration Surface',
          evidenceExchangeIds: ['ex_admin']
        })
      ],
      signalsBySurface: {}
    };

    const result = synthesizer.synthesize(inventory);
    expect(result.candidates.length).toBe(1);

    const cand = result.candidates[0];
    expect(cand.candidateId).toBe('cand_BAC_POST::/api/administration');
    expect(cand.targetVector).toBe('BAC');
    expect(cand.parameterTargets).toEqual([]);
    expect(cand.headerTargets).toEqual(['cookie']);
    expect(cand.synthesisReasons).toEqual(['PRIVILEGE_DIVERGENCE_OPPORTUNITY', 'RESTRICTED_BOUNDARY_ADJACENT']);
  });

  test('3. Tenant Isolation candidate synthesis mapping', () => {
    const inventory: ResourceSignalInventory = {
      exportVersion: '1.0.0',
      signals: [
        createMockSignal({
          resourceFamily: '/api/tenant/settings',
          resourceSignature: 'PUT::/api/tenant/settings',
          httpMethod: 'PUT',
          primaryType: 'TENANT',
          investigationSignals: ['TENANT_SCOPED'],
          authorizationSurface: 'Tenant Surface',
          parameterSignature: ['tenantId', 'companyName'],
          evidenceExchangeIds: ['ex_tenant']
        })
      ],
      signalsBySurface: {}
    };

    const result = synthesizer.synthesize(inventory);
    expect(result.candidates.length).toBe(1);

    const cand = result.candidates[0];
    expect(cand.candidateId).toBe('cand_TENANT_ISOLATION_PUT::/api/tenant/settings');
    expect(cand.targetVector).toBe('TENANT_ISOLATION');
    expect(cand.parameterTargets).toEqual(['companyName', 'tenantId']);
    expect(cand.headerTargets).toEqual(['cookie', 'x-tenant-id']);
    expect(cand.synthesisReasons).toEqual(['TENANT_PARTITION_EXPOSED']);
  });

  test('3b. Generalized path parameter and expanded tenancy checks', () => {
    const inventory: ResourceSignalInventory = {
      exportVersion: '1.0.0',
      signals: [
        createMockSignal({
          resourceFamily: '/api/order/:orderId/item/:itemId',
          resourceSignature: 'GET::/api/order/:orderId/item/:itemId',
          httpMethod: 'GET',
          primaryType: 'DOCUMENT',
          investigationSignals: ['OBJECT_IDENTIFIER_PRESENT', 'TENANT_SCOPED'],
          authorizationSurface: 'Order Surface',
          parameterSignature: ['workspaceId', 'teamName'],
          evidenceExchangeIds: ['ex_gen']
        })
      ],
      signalsBySurface: {}
    };

    const result = synthesizer.synthesize(inventory);
    
    // Generates 2 independent candidates (IDOR and Tenant Isolation)
    expect(result.candidates.length).toBe(2);

    const idorCand = result.candidates.find(c => c.targetVector === 'IDOR');
    const tenantCand = result.candidates.find(c => c.targetVector === 'TENANT_ISOLATION');

    expect(idorCand).toBeDefined();
    expect(tenantCand).toBeDefined();

    // Verify dynamic route keys are generically parsed: orderId, itemId
    expect(idorCand!.parameterTargets).toEqual(['itemId', 'orderId', 'workspaceId']); 

    // Verify expanded tenancy keywords (workspaceId, teamName) are mapped
    expect(tenantCand!.parameterTargets).toEqual(['teamName', 'workspaceId']);
  });

  test('4. Multi-vector candidate generation and collision prevention', () => {
    // Endpoints like /rest/basket/:basketId with tenant parameters
    // should generate both an IDOR and a Tenant Isolation candidate
    const inventory: ResourceSignalInventory = {
      exportVersion: '1.0.0',
      signals: [
        createMockSignal({
          resourceFamily: '/rest/basket/:basketId',
          resourceSignature: 'GET::/rest/basket/:basketId',
          httpMethod: 'GET',
          primaryType: 'USER',
          investigationSignals: ['OBJECT_IDENTIFIER_PRESENT', 'TENANT_SCOPED'],
          authorizationSurface: 'Basket Surface',
          parameterSignature: ['basketId', 'tenantId'],
          evidenceExchangeIds: ['ex_multi']
        })
      ],
      signalsBySurface: {}
    };

    const result = synthesizer.synthesize(inventory);
    
    // Generates 2 independent candidates
    expect(result.candidates.length).toBe(2);

    const idorCand = result.candidates.find(c => c.targetVector === 'IDOR');
    const tenantCand = result.candidates.find(c => c.targetVector === 'TENANT_ISOLATION');

    expect(idorCand).toBeDefined();
    expect(tenantCand).toBeDefined();

    // Unique collision-free IDs
    expect(idorCand!.candidateId).toBe('cand_IDOR_GET::/rest/basket/:basketId');
    expect(tenantCand!.candidateId).toBe('cand_TENANT_ISOLATION_GET::/rest/basket/:basketId');
  });

  test('5. Inventory grouping by Vector and Surface', () => {
    const inventory: ResourceSignalInventory = {
      exportVersion: '1.0.0',
      signals: [
        createMockSignal({
          resourceFamily: '/rest/basket/:basketId',
          resourceSignature: 'GET::/rest/basket/:basketId',
          primaryType: 'USER',
          investigationSignals: ['OBJECT_IDENTIFIER_PRESENT'],
          authorizationSurface: 'Basket Surface'
        }),
        createMockSignal({
          resourceFamily: '/api/administration',
          resourceSignature: 'GET::/api/administration',
          primaryType: 'DOCUMENT',
          investigationSignals: ['BOUNDARY_ADJACENT'],
          authorizationSurface: 'Administration Surface'
        })
      ],
      signalsBySurface: {}
    };

    const result = synthesizer.synthesize(inventory);

    // Vector Groups
    expect(result.candidatesByVector.IDOR.length).toBe(1);
    expect(result.candidatesByVector.BAC.length).toBe(1);
    expect(result.candidatesByVector.TENANT_ISOLATION.length).toBe(0);

    // Surface Groups
    expect(result.candidatesBySurface['Basket Surface'].length).toBe(1);
    expect(result.candidatesBySurface['Administration Surface'].length).toBe(1);
  });

  test('6. Deterministic sorting & repeated execution', () => {
    const inventory: ResourceSignalInventory = {
      exportVersion: '1.0.0',
      signals: [
        createMockSignal({
          resourceFamily: '/rest/user/:userId',
          resourceSignature: 'GET::/rest/user/:userId',
          primaryType: 'USER',
          investigationSignals: ['OBJECT_IDENTIFIER_PRESENT'],
          authorizationSurface: 'User Surface'
        }),
        createMockSignal({
          resourceFamily: '/rest/basket/:basketId',
          resourceSignature: 'GET::/rest/basket/:basketId',
          primaryType: 'USER',
          investigationSignals: ['OBJECT_IDENTIFIER_PRESENT'],
          authorizationSurface: 'Basket Surface'
        })
      ],
      signalsBySurface: {}
    };

    const res1 = synthesizer.synthesize(inventory);
    const res2 = synthesizer.synthesize(inventory);

    // Alphabetical ID ordering: IDOR_GET::/rest/basket comes before IDOR_GET::/rest/user
    expect(res1.candidates[0].candidateId).toBe('cand_IDOR_GET::/rest/basket/:basketId');
    expect(res1.candidates[1].candidateId).toBe('cand_IDOR_GET::/rest/user/:userId');

    // Stably grouped ordering inside surface lists
    expect(res1.candidatesBySurface['User Surface'][0].candidateId).toBe('cand_IDOR_GET::/rest/user/:userId');

    // Byte-identical check
    const str1 = JSON.stringify(res1);
    const str2 = JSON.stringify(res2);
    expect(str1).toBe(str2);

    // Timeless check
    expect((res1 as any).generatedAt).toBeUndefined();
    expect((res2 as any).generatedAt).toBeUndefined();
  });
});
