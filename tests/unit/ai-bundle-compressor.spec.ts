import { test, expect } from '@playwright/test';
import { AiBundleCompressor } from '../../src/intelligence/artifacts/ai-bundle-compressor';
import { DefaultInvestigationContext } from '../../src/intelligence/orchestration/investigation-context';
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

test.describe('AiBundleCompressor - Canonical Projection', () => {
  test('should accurately project frozen context into bundle without mutating arrays', () => {
    const compressor = new AiBundleCompressor();
    const exchanges = [
      createMockExchange(1, 'GET', 'http://test.com/users/123')
    ];
    
    const context = new DefaultInvestigationContext('inv_123', 'http://test.com');
    context.attachEvidence('ex_1');
    context.attachPrioritizedCandidates([
      {
        candidateIdentity: 'cand_1',
        candidateType: 'IDOR',
        targetEntityId: 'api:GET:/user',
        priorityRank: 1,
        score: { totalScore: 0.9, components: [] },
        lifecycle: 'READY_FOR_SCORING',
        validatedFindingIds: [],
        evidenceExchangeIds: ['ex_1'],
        baseRoleContext: 'user',
        comparisonRoleContext: 'admin',
        ownershipReferences: [],
        supportingSignals: []
      }
    ]);
    context.transitionTo('COMPLETED');

    const bundle = compressor.compress('test.com', context, exchanges, [], ExportProfileMode.CONCISE_AI);
    
    expect(bundle.investigationId).toBe('inv_123');
    expect(bundle.prioritizedCandidates.length).toBe(1);
    expect(bundle.prioritizedCandidates[0].candidateIdentity).toBe('cand_1');
    expect(bundle.evidenceExchanges.length).toBe(1);
    
    // Ensure array references are isolated (immutable copy)
    expect(bundle.prioritizedCandidates).not.toBe(context.prioritizedCandidates);
  });

});
