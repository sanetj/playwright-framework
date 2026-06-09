import { test, expect } from '@playwright/test';
import { AiBundleCompressor } from '../../src/intelligence/artifacts/ai-bundle-compressor';
import { DifferentialComparisonResult } from '../../src/intelligence/differentials/concrete-differential-engine';
import { CanonicalHttpExchange } from '../../src/runtime/evidence/canonical-http-evidence';
import { ExportProfileMode } from '../../src/runtime/artifacts/export-profile';

function createMockExchange(index: number, method: string, url: string): CanonicalHttpExchange {
  return {
    exchangeId: { 
      id: `ex_${index}`,
      requestFingerprint: `mock_fp_${index}`,
      navigationId: `mock_nav_${index}`,
      sequenceNumber: index
    },
    sessionId: 'test_session',
    timestamp: Date.now(),
    durationMs: 100,
    source: 'playwright',
    request: { method, url, headers: [] },
    response: { status: 200, headers: [] }
  };
}

test.describe('AiBundleCompressor', () => {
  test('should retain evidence for canonicalized numeric routes', () => {
    const compressor = new AiBundleCompressor();
    const exchanges: CanonicalHttpExchange[] = [
      createMockExchange(1, 'GET', 'http://test.com/users/123')
    ];
    const diffResult: DifferentialComparisonResult = {
      baseRoleId: 'user',
      comparisonRoleId: 'admin',
      exclusiveToBase: [],
      exclusiveToComparison: [],
      sharedReachability: [],
      statusContradictions: [],
      findings: [{
        type: 'PRIVILEGE_ESCALATION_CANDIDATE',
        targetEntityId: 'api:GET:http://test.com/users/{ID}',
        targetRole: 'admin',
        description: 'Mock finding',
        isValidated: true,
        validationConfidence: 'HIGH',
        proofs: [{ lineageId: 'mock' } as any]
      } as any]
    };
    const bundle = compressor.compress('test.com', diffResult, exchanges, [], ExportProfileMode.CONCISE_AI);
    expect(bundle.evidenceExchanges.length).toBe(1);
    const hasEx = JSON.stringify(bundle.evidenceExchanges).includes('ex_1');
    expect(hasEx).toBe(true);
  });

  test('should retain evidence for canonicalized prefix routes', () => {
    const compressor = new AiBundleCompressor();
    const exchanges: CanonicalHttpExchange[] = [
      createMockExchange(1, 'GET', 'http://test.com/orders/req_abc123')
    ];
    const diffResult: DifferentialComparisonResult = {
      baseRoleId: 'user',
      comparisonRoleId: 'admin',
      exclusiveToBase: [],
      exclusiveToComparison: [],
      sharedReachability: [],
      statusContradictions: [],
      findings: [{
        type: 'PRIVILEGE_ESCALATION_CANDIDATE',
        targetEntityId: 'api:GET:http://test.com/orders/{ID}',
        targetRole: 'admin',
        description: 'Mock finding'
      } as any]
    };
    const bundle = compressor.compress('test.com', diffResult, exchanges, [], ExportProfileMode.CONCISE_AI);
    expect(bundle.evidenceExchanges.length).toBe(1);
    const hasEx = JSON.stringify(bundle.evidenceExchanges).includes('ex_1');
    expect(hasEx).toBe(true);
  });

  test('should retain evidence for canonicalized mongo routes', () => {
    const compressor = new AiBundleCompressor();
    const exchanges: CanonicalHttpExchange[] = [
      createMockExchange(1, 'GET', 'http://test.com/files/507f1f77bcf86cd799439011')
    ];
    const diffResult: DifferentialComparisonResult = {
      baseRoleId: 'user',
      comparisonRoleId: 'admin',
      exclusiveToBase: [],
      exclusiveToComparison: [],
      sharedReachability: [],
      statusContradictions: [],
      findings: [{
        type: 'PRIVILEGE_ESCALATION_CANDIDATE',
        targetEntityId: 'api:GET:http://test.com/files/{ID}',
        targetRole: 'admin',
        description: 'Mock finding'
      } as any]
    };
    const bundle = compressor.compress('test.com', diffResult, exchanges, [], ExportProfileMode.CONCISE_AI);
    expect(bundle.evidenceExchanges.length).toBe(1);
    const hasEx = JSON.stringify(bundle.evidenceExchanges).includes('ex_1');
    expect(hasEx).toBe(true);
  });

  test('should retain evidence for static routes', () => {
    const compressor = new AiBundleCompressor();
    const exchanges: CanonicalHttpExchange[] = [
      createMockExchange(1, 'GET', 'http://test.com/api/admin/settings')
    ];
    const diffResult: DifferentialComparisonResult = {
      baseRoleId: 'user',
      comparisonRoleId: 'admin',
      exclusiveToBase: [],
      exclusiveToComparison: [],
      sharedReachability: [],
      statusContradictions: [],
      findings: [{
        type: 'PRIVILEGE_ESCALATION_CANDIDATE',
        targetEntityId: 'api:GET:http://test.com/api/admin/settings',
        targetRole: 'admin',
        description: 'Mock finding'
      } as any]
    };
    const bundle = compressor.compress('test.com', diffResult, exchanges, [], ExportProfileMode.CONCISE_AI);
    expect(bundle.evidenceExchanges.length).toBe(1);
    const hasEx = JSON.stringify(bundle.evidenceExchanges).includes('ex_1');
    expect(hasEx).toBe(true);
  });

  test('should preserve bundle schema', () => {
    const compressor = new AiBundleCompressor();
    const diffResult: DifferentialComparisonResult = {
      baseRoleId: 'user',
      comparisonRoleId: 'admin',
      exclusiveToBase: [],
      exclusiveToComparison: [],
      sharedReachability: [],
      statusContradictions: [],
      findings: []
    };

    const bundle = compressor.compress('test.com', diffResult, [], [], ExportProfileMode.CONCISE_AI, [
      { entityId: 'foo', sessionId: 'sess1', linkType: 'OWNER', establishedAtTs: 123, evidenceEventId: 'ev1' }
    ]);
    
    expect(bundle).toHaveProperty('targetDomain');
    expect(bundle).toHaveProperty('generatedAt');
    expect(bundle).toHaveProperty('exportMode');
    expect(bundle).toHaveProperty('differentialAnalysis');
    expect(bundle).toHaveProperty('evidenceExchanges');
    expect(bundle).toHaveProperty('lineage');
    expect(Array.isArray(bundle.evidenceExchanges)).toBe(true);
    expect(bundle).toHaveProperty('ownershipLinks');
    expect(bundle.ownershipLinks?.length).toBe(1);
    expect(bundle.ownershipLinks?.[0].entityId).toBe('foo');
  });
});
