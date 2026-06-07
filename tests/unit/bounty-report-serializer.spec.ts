import { test, expect } from '@playwright/test';
import { BountyReportSerializer } from '../../src/intelligence/artifacts/bounty-report-serializer';
import { InvestigationBundle } from '../../src/intelligence/artifacts/ai-bundle-compressor';
import * as fs from 'fs';
import * as path from 'path';

test.describe('BountyReportSerializer - Slice E Validation-Aware Reporting', () => {
  const getOutputPath = (testInfo: any) => path.join(__dirname, `.test-output-${testInfo.workerIndex}-${testInfo.project.name}.md`);

  test.afterEach(({}, testInfo) => {
    const p = getOutputPath(testInfo);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  const createMockBundle = (findings: any[], summary?: any): InvestigationBundle => ({
    targetDomain: 'target.com',
    exportMode: 'CONCISE_AI' as any,
    differentialAnalysis: {
      baseRole: 'LowPriv',
      comparisonRole: 'HighPriv',
      findings
    },
    evidenceExchanges: [
      {
        exchangeId: { id: 'ex_1', sequenceNumber: 1 },
        sessionId: 'session_1',
        request: { method: 'GET', url: 'http://target.com', headers: [], bodyStr: '' },
        response: { status: 200, headers: [], bodyStr: '' }
      }
    ],
    groupedContradictionSummary: summary,
    generatedAt: new Date().toISOString(),
    lineage: []
  });

  test('Test 1: HIGH Confidence', ({}, testInfo) => {
    const outputPath = getOutputPath(testInfo);
    const serializer = new BountyReportSerializer();
    const bundle = createMockBundle([
      { 
        targetEndpoint: 'api:GET:https://target.com/users/1', 
        type: 'TEST', 
        isValidated: true,
        validationConfidence: 'HIGH',
        proofs: [{ proofId: '1' }]
      }
    ]);

    serializer.serializeToMarkdown(bundle, outputPath);
    const md = fs.readFileSync(outputPath, 'utf-8');

    expect(md).toContain('Deterministic Replay Verified');
    expect(md).toContain('Proof Constructed');
    expect(md).toContain('(HIGH)'); // severity output
  });

  test('Test 2: LOW Confidence', ({}, testInfo) => {
    const outputPath = getOutputPath(testInfo);
    const serializer = new BountyReportSerializer();
    const bundle = createMockBundle([
      { 
        targetEndpoint: 'api:GET:https://target.com/users/1', 
        type: 'TEST', 
        isValidated: false,
        validationConfidence: 'LOW'
      }
    ]);

    serializer.serializeToMarkdown(bundle, outputPath);
    const md = fs.readFileSync(outputPath, 'utf-8');

    expect(md).toContain('Unvalidated');
    expect(md).toContain('(LOW)'); // severity output
  });

  test('Test 3: Privilege Escalation', ({}, testInfo) => {
    const outputPath = getOutputPath(testInfo);
    const serializer = new BountyReportSerializer();
    const bundle = createMockBundle([
      { 
        targetEndpoint: 'api:GET:https://target.com/users/1', 
        type: 'PRIVILEGE_ESCALATION_CANDIDATE'
      }
    ]);

    serializer.serializeToMarkdown(bundle, outputPath);
    const md = fs.readFileSync(outputPath, 'utf-8');

    expect(md).toContain('Clear Auth Boundary Crossed');
  });

  test('Test 4: Legacy Artifact', ({}, testInfo) => {
    const outputPath = getOutputPath(testInfo);
    const serializer = new BountyReportSerializer();
    const bundle = createMockBundle([
      { 
        targetEndpoint: 'api:GET:https://target.com/users/1', 
        type: 'TEST',
        severity: 'MEDIUM'
      }
    ]);

    expect(() => serializer.serializeToMarkdown(bundle, outputPath)).not.toThrow();
    
    const md = fs.readFileSync(outputPath, 'utf-8');
    expect(md).toContain('## Findings (1)');
    expect(md).toContain('(MEDIUM)'); // Fallback to severity
  });

  test('Test 5: Slice D Regression Protection', ({}, testInfo) => {
    const outputPath = getOutputPath(testInfo);
    const serializer = new BountyReportSerializer();
    const bundle = createMockBundle([
      { targetEndpoint: 'api:GET:https://target.com/users/1', type: 'PRIVILEGE_ESCALATION_CANDIDATE', isValidated: true },
      { targetEndpoint: 'api:POST:https://target.com/users/1', type: 'PRIVILEGE_ESCALATION_CANDIDATE', isValidated: false }
    ]);

    serializer.serializeToMarkdown(bundle, outputPath);
    const md = fs.readFileSync(outputPath, 'utf-8');

    expect(md).toContain('## Clusters');
    expect(md).toContain('### Path Family: /users/{ID}');
    expect(md).toContain('- Total Findings: 2');
    expect(md).toContain('- Validated: 1');
    expect(md).toContain('- Unvalidated: 1');
    
    const clusterMatches = md.match(/### Path Family:/g);
    expect(clusterMatches?.length).toBe(1);
  });

  test('Test 6: Evidence Section Regression Protection', ({}, testInfo) => {
    const outputPath = getOutputPath(testInfo);
    const serializer = new BountyReportSerializer();
    const bundle = createMockBundle([]);

    serializer.serializeToMarkdown(bundle, outputPath);
    const md = fs.readFileSync(outputPath, 'utf-8');

    expect(md).toContain('## Evidence Exchanges (1)');
    expect(md).toContain('### Exchange `ex_1`');
    expect(md).toContain('**Request:**');
    expect(md).toContain('**Response:**');
  });

  test('Test 7: Grouped Contradiction Summary Preservation', ({}, testInfo) => {
    const outputPath = getOutputPath(testInfo);
    const serializer = new BountyReportSerializer();
    const summary = {
      totalContradictions: 1,
      contradictions: [{
        findingType: 'STATUS_CONTRADICTION',
        endpoint: 'api:GET:/users/1',
        method: 'GET',
        url: '/users/1',
        severity: 'HIGH',
        description: 'Test',
        evidenceExchangeIds: ['ex_1'],
        lineageRefs: []
      }]
    };
    const bundle = createMockBundle([], summary);

    serializer.serializeToMarkdown(bundle, outputPath);
    const md = fs.readFileSync(outputPath, 'utf-8');

    expect(md).toContain('## Grouped Contradiction Summary');
    expect(md).toContain('**Total Detected Contradictions**: 1');
  });
});
