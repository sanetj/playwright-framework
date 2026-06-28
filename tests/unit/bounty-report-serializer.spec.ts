import { test, expect } from '@playwright/test';
import { BountyReportSerializer } from '../../src/intelligence/artifacts/bounty-report-serializer';
import { InvestigationBundle } from '../../src/intelligence/artifacts/ai-bundle-compressor';
import * as fs from 'fs';
import * as path from 'path';

test.describe('BountyReportSerializer - Canonical Projection', () => {
  const getOutputPath = (testInfo: any) => path.join(__dirname, `.test-output-${testInfo.workerIndex}-${testInfo.project.name}.md`);

  test.afterEach(({}, testInfo) => {
    const p = getOutputPath(testInfo);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  const createMockBundle = (): InvestigationBundle => ({
    targetDomain: 'target.com',
    exportMode: 'CONCISE_AI' as any,
    investigationId: 'inv_123',
    generatedAt: new Date().toISOString(),
    prioritizedCandidates: [
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
    ],
    attackGraphs: [],
    consistencyReports: [],
    noveltyReports: [],
    sufficiencyReports: [],
    explanationPlans: [],
    evidenceExchanges: [
      {
        exchangeId: { id: 'ex_1', sequenceNumber: 1 },
        sessionId: 'session_1',
        request: { method: 'GET', url: 'http://target.com', headers: [], bodyStr: '' },
        response: { status: 200, headers: [], bodyStr: '' }
      }
    ],
    lineage: []
  });

  test('Should serialize canonical bundle to markdown', ({}, testInfo) => {
    const outputPath = getOutputPath(testInfo);
    const serializer = new BountyReportSerializer();
    const bundle = createMockBundle();

    serializer.serializeToMarkdown(bundle, outputPath);
    const md = fs.readFileSync(outputPath, 'utf-8');

    expect(md).toContain('Investigation Bundle: target.com');
    expect(md).toContain('cand_1');
    expect(md).toContain('ex_1');
  });

});
