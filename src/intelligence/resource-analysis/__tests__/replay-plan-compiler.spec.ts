import { test, expect } from '@playwright/test';
import { ReplayPlanCompiler } from '../replay-plan-compiler';
import { BundleInventory, InvestigationBundle } from '../investigation-bundle';
import { InvestigationAssemblyInventory, InvestigationAssembly } from '../investigation-assembly';
import { ReplayCandidateInventory, ReplayCandidate } from '../replay-candidate';
import { CanonicalHttpExchange } from '../../../runtime/evidence/canonical-http-evidence';

function createMockBundle(data: {
  id: string;
  assemblyId: string;
  family?: string;
}): InvestigationBundle {
  return {
    bundleId: data.id,
    candidateId: `cand_${data.id}`,
    narrativeId: `nar_${data.id}`,
    evidenceMapId: `evmap_${data.id}`,
    assemblyId: data.assemblyId,
    vector: 'IDOR',
    targetResourceFamily: data.family || '/api/Addresss/:id',
    authorizationSurface: 'Addresss Surface'
  };
}

function createMockAssembly(data: {
  id: string;
  candidateId: string;
  exchangeId: string;
  subject?: string;
  owner?: string;
  family?: string;
  concreteId?: string;
}): InvestigationAssembly {
  return {
    assemblyId: data.id,
    vector: 'IDOR',
    subjectId: data.subject || 'usr_attacker',
    ownerId: data.owner || 'usr_owner',
    resourceInstanceKey: `${data.family || '/api/Addresss/:id'}::${data.concreteId || '8'}`,
    targetResourceFamily: data.family || '/api/Addresss/:id',
    targetResourceId: data.concreteId || '8',
    authorizationSurface: 'Addresss Surface',
    authorizationPairId: `pair_${data.id}`,
    replayCandidateId: data.candidateId,
    blueprintId: `bp_${data.id}`,
    baselineExchangeId: data.exchangeId
  };
}

function createMockCandidate(data: {
  id: string;
  family?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
}): ReplayCandidate {
  return {
    candidateId: data.id,
    resourceFamily: data.family || '/api/Addresss/:id',
    httpMethod: data.method || 'GET',
    authorizationSurface: 'Addresss Surface',
    targetVector: 'IDOR',
    baselineExchangeId: `ex_base_${data.id}`,
    parameterTargets: [],
    headerTargets: [],
    synthesisReasons: ['OBJECT_IDENTIFIER_PRESENT']
  };
}

function createMockExchange(data: {
  id: string;
  method?: string;
  url?: string;
  headers?: { name: string; value: string }[];
  bodyStr?: string;
}): CanonicalHttpExchange {
  return {
    exchangeId: { id: data.id, requestFingerprint: `rf_${data.id}`, navigationId: 'nav_test', sequenceNumber: 1 },
    sessionId: 'sess_test',
    timestamp: 1716930000000,
    source: 'playwright',
    request: {
      method: data.method || 'GET',
      url: data.url || 'http://localhost/api/Addresss/8',
      headers: data.headers || [{ name: 'Accept', value: 'application/json' }]
    }
  };
}

test.describe('Phase 11.1A — Replay Plan Compiler Unit Tests', () => {
  let compiler: ReplayPlanCompiler;

  test.beforeEach(() => {
    compiler = new ReplayPlanCompiler();
  });

  test('1. Deterministic plan generation with path parameter substitution', () => {
    const bundleInventory: BundleInventory = {
      bundles: [
        createMockBundle({ id: 'b1', assemblyId: 'asm1', family: '/api/Addresss/:id' })
      ],
      bundlesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [
        createMockAssembly({ id: 'asm1', candidateId: 'cand_address', exchangeId: 'ex1', family: '/api/Addresss/:id', concreteId: '8' })
      ],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const candidateInventory: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({ id: 'cand_address', family: '/api/Addresss/:id', method: 'GET' })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const exchanges: CanonicalHttpExchange[] = [
      createMockExchange({
        id: 'ex1',
        headers: [
          { name: 'Accept', value: 'application/json' },
          { name: 'Authorization', value: 'Bearer SEC_TOKEN' },
          { name: 'Cookie', value: 'session=abc' }
        ]
      })
    ];

    const result = compiler.compilePlans(bundleInventory, assemblyInventory, candidateInventory, exchanges);
    
    expect(result.plans.length).toBe(1);
    const plan = result.plans[0];
    expect(plan.planId).toBe('plan_b1');
    expect(plan.requestTemplate.method).toBe('GET');
    expect(plan.requestTemplate.pathTemplate).toBe('/api/Addresss/:id');
    expect(plan.requestTemplate.concretePath).toBe('/api/Addresss/8');
    
    // Assert headers are cleaned of secrets case-insensitively
    expect(plan.requestTemplate.headers.find(h => h.name.toLowerCase() === 'authorization')).toBeUndefined();
    expect(plan.requestTemplate.headers.find(h => h.name.toLowerCase() === 'cookie')).toBeUndefined();
    expect(plan.requestTemplate.headers.find(h => h.name.toLowerCase() === 'accept')).toBeDefined();
  });

  test('2. Byte-identical repeated compilation guarantees absolute determinism', () => {
    const bundleInventory: BundleInventory = {
      bundles: [
        createMockBundle({ id: 'b2', assemblyId: 'asm2', family: '/api/Addresss/:id' }),
        createMockBundle({ id: 'b1', assemblyId: 'asm1', family: '/api/Addresss/:id' })
      ],
      bundlesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [
        createMockAssembly({ id: 'asm1', candidateId: 'cand_address', exchangeId: 'ex1', family: '/api/Addresss/:id', concreteId: '8' }),
        createMockAssembly({ id: 'asm2', candidateId: 'cand_address', exchangeId: 'ex2', family: '/api/Addresss/:id', concreteId: '9' })
      ],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const candidateInventory: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({ id: 'cand_address', family: '/api/Addresss/:id', method: 'GET' })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const exchanges: CanonicalHttpExchange[] = [
      createMockExchange({ id: 'ex1' }),
      createMockExchange({ id: 'ex2' })
    ];

    const res1 = compiler.compilePlans(bundleInventory, assemblyInventory, candidateInventory, exchanges);
    const res2 = compiler.compilePlans(bundleInventory, assemblyInventory, candidateInventory, exchanges);

    // Verify ordering by planId is deterministic: plan_b1 must precede plan_b2
    expect(res1.plans[0].planId).toBe('plan_b1');
    expect(res1.plans[1].planId).toBe('plan_b2');

    expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
    expect(Object.isFrozen(res1)).toBe(true);
    expect(Object.isFrozen(res1.plans)).toBe(true);
  });

  test('3. Replay template invariant enforcement: Reject missing candidate templates', () => {
    const bundleInventory: BundleInventory = {
      bundles: [createMockBundle({ id: 'b1', assemblyId: 'asm1' })],
      bundlesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [createMockAssembly({ id: 'asm1', candidateId: 'missing_cand', exchangeId: 'ex1' })],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const candidateInventory: ReplayCandidateInventory = {
      candidates: [],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const exchanges: CanonicalHttpExchange[] = [createMockExchange({ id: 'ex1' })];

    expect(() => {
      compiler.compilePlans(bundleInventory, assemblyInventory, candidateInventory, exchanges);
    }).toThrow(/MISSING_REPLAY_TEMPLATE/);
  });

  test('4. BaselineExchangeId preservation and raw exchange lookup check', () => {
    const bundleInventory: BundleInventory = {
      bundles: [createMockBundle({ id: 'b1', assemblyId: 'asm1' })],
      bundlesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [createMockAssembly({ id: 'asm1', candidateId: 'cand1', exchangeId: 'ex1' })],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const candidateInventory: ReplayCandidateInventory = {
      candidates: [createMockCandidate({ id: 'cand1' })],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    // missing exchange data
    expect(() => {
      compiler.compilePlans(bundleInventory, assemblyInventory, candidateInventory, []);
    }).toThrow(/MISSING_EXCHANGE_DATA/);
  });

  test('5. Safe method acceptance: GET and HEAD are permitted', () => {
    const bundleInventory: BundleInventory = {
      bundles: [
        createMockBundle({ id: 'b1', assemblyId: 'asm1' }),
        createMockBundle({ id: 'b2', assemblyId: 'asm2' })
      ],
      bundlesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [
        createMockAssembly({ id: 'asm1', candidateId: 'cand_get', exchangeId: 'ex1' }),
        createMockAssembly({ id: 'asm2', candidateId: 'cand_head', exchangeId: 'ex2' })
      ],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const candidateInventory: ReplayCandidateInventory = {
      candidates: [
        createMockCandidate({ id: 'cand_get', method: 'GET' }),
        createMockCandidate({ id: 'cand_head', method: 'HEAD' })
      ],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const exchanges: CanonicalHttpExchange[] = [
      createMockExchange({ id: 'ex1', method: 'GET' }),
      createMockExchange({ id: 'ex2', method: 'HEAD' })
    ];

    const result = compiler.compilePlans(bundleInventory, assemblyInventory, candidateInventory, exchanges);
    expect(result.plans.length).toBe(2);
    expect(result.plans[0].allowedMethod).toBe('GET');
    expect(result.plans[1].allowedMethod).toBe('HEAD');
  });

  test('6. Unsafe method rejection: POST, PUT, DELETE, PATCH throw error', () => {
    const methods: ('POST' | 'PUT' | 'DELETE' | 'PATCH')[] = ['POST', 'PUT', 'DELETE', 'PATCH'];

    for (const m of methods) {
      const bundleInventory: BundleInventory = {
        bundles: [createMockBundle({ id: 'b1', assemblyId: 'asm1' })],
        bundlesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
      };

      const assemblyInventory: InvestigationAssemblyInventory = {
        assemblies: [createMockAssembly({ id: 'asm1', candidateId: 'cand_unsafe', exchangeId: 'ex1' })],
        assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
        assembliesBySubject: {},
        assembliesByResource: {}
      };

      const candidateInventory: ReplayCandidateInventory = {
        candidates: [createMockCandidate({ id: 'cand_unsafe', method: m })],
        candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
        candidatesBySurface: {}
      };

      const exchanges: CanonicalHttpExchange[] = [createMockExchange({ id: 'ex1', method: m })];

      expect(() => {
        compiler.compilePlans(bundleInventory, assemblyInventory, candidateInventory, exchanges);
      }).toThrow(/UNSUPPORTED_METHOD/);
    }
  });

  test('7. Traceability preservation mapping check', () => {
    const bundleInventory: BundleInventory = {
      bundles: [createMockBundle({ id: 'b1', assemblyId: 'asm1' })],
      bundlesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] }
    };

    const assemblyInventory: InvestigationAssemblyInventory = {
      assemblies: [createMockAssembly({ id: 'asm1', candidateId: 'cand1', exchangeId: 'ex1' })],
      assembliesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      assembliesBySubject: {},
      assembliesByResource: {}
    };

    const candidateInventory: ReplayCandidateInventory = {
      candidates: [createMockCandidate({ id: 'cand1' })],
      candidatesByVector: { IDOR: [], BAC: [], TENANT_ISOLATION: [] },
      candidatesBySurface: {}
    };

    const exchanges: CanonicalHttpExchange[] = [createMockExchange({ id: 'ex1' })];

    const result = compiler.compilePlans(bundleInventory, assemblyInventory, candidateInventory, exchanges);
    const plan = result.plans[0];
    
    expect(plan.bundleId).toBe('b1');
    expect(plan.assemblyId).toBe('asm1');
    expect(plan.baselineExchangeId).toBe('ex1');
    expect(plan.replayCandidateId).toBe('cand1');
  });
});
