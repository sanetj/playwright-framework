import { test, expect } from '@playwright/test';
import { PlaywrightMultiSessionRuntime } from '../../execution/playwright-multi-session';
import { LivePerturbationInterceptor } from '../../instrumentation/live-perturbation-interceptor';
import { JuiceShopOperationalValidator, JuiceShopWorkflowValidationResult } from '../rv3a-juice-shop-validation';
import { TargetSafetyProfile } from '../../../intelligence/perturbation/probe-safety';
import { RuntimeRoleProfile, SessionIsolationBoundary } from '../../../intelligence/runtime/multi-session-runtime';
import { CanonicalHttpExchange } from '../../evidence/canonical-http-evidence';
import { ReplayMutationPlan } from '../../replay/replay-mutation-plan';
import * as fs from 'fs';
import * as path from 'path';

function createJuiceExchange(data: {
  id: string;
  sessionId: string;
  url: string;
  status: number;
  bodyStr?: string;
}): CanonicalHttpExchange {
  return {
    exchangeId: { id: data.id, requestFingerprint: `rf_${data.id}`, navigationId: 'nav_juice', sequenceNumber: 300 },
    sessionId: data.sessionId,
    timestamp: 1716930000000,
    durationMs: 50,
    source: 'playwright',
    request: {
      method: 'GET',
      url: data.url,
      headers: [{ name: 'accept', value: 'application/json' }]
    },
    response: {
      status: data.status,
      headers: [{ name: 'content-type', value: 'application/json' }],
      bodyStr: data.bodyStr
    }
  };
}

function exportArtifacts(workflowFilePrefix: string, result: JuiceShopWorkflowValidationResult): void {
  const wsDir = '/Users/sanketjadhavar/Desktop/BrowserIntelAntiGravity/playwright-framework/artifacts/rv3';
  const appDataDir = '/Users/sanketjadhavar/.gemini/antigravity-ide/brain/ff58b043-3c8d-4a9c-bb6f-1a53573176b8/artifacts/rv3';

  const targetDirs = [wsDir, appDataDir];

  for (const dir of targetDirs) {
    fs.mkdirSync(dir, { recursive: true });

    // 1. Export the full workflow validation result JSON
    fs.writeFileSync(
      path.join(dir, `${workflowFilePrefix}_result.json`),
      JSON.stringify(result, null, 2),
      'utf-8'
    );

    // 2. Export the InvestigationBundle JSON
    fs.writeFileSync(
      path.join(dir, `${workflowFilePrefix}_bundle.json`),
      JSON.stringify(result.bundle, null, 2),
      'utf-8'
    );

    // 3. Export the human-readable Markdown summary
    const mdContent = `# Human Readable Evidence Summary: ${result.workflowName}
- **Verdict**: ${result.summary.verdict}
- **Target Role**: ${result.summary.targetRole}
- **Original Target URI**: ${result.summary.originalTargetUri}
- **Reproducibility Rate**: ${result.summary.reproducibilityRate}

## Lineage Trace
\`\`\`text
${result.summary.lineageTrace}
\`\`\`

## Actionable Rejection Advice
${result.summary.actionableRejectionAdvice || 'None'}

## Serialized Trace Footprint
\`\`\`text
${result.bundle.serializedTraceFootprint}
\`\`\`
`;
    fs.writeFileSync(
      path.join(dir, `${workflowFilePrefix}_summary.md`),
      mdContent,
      'utf-8'
    );
  }
}

function exportLiveArtifacts(result: JuiceShopWorkflowValidationResult): void {
  const liveDir = '/Users/sanketjadhavar/Desktop/BrowserIntelAntiGravity/playwright-framework/artifacts/rv3a-live';
  fs.mkdirSync(liveDir, { recursive: true });

  // 1. live_bundle.json
  fs.writeFileSync(
    path.join(liveDir, 'live_bundle.json'),
    JSON.stringify(result.bundle, null, 2),
    'utf-8'
  );

  // 2. live_summary.md
  const mdContent = `# Human Readable Evidence Summary: ${result.workflowName}
- **Verdict**: ${result.summary.verdict}
- **Target Role**: ${result.summary.targetRole}
- **Original Target URI**: ${result.summary.originalTargetUri}
- **Reproducibility Rate**: ${result.summary.reproducibilityRate}

## Lineage Trace
\`\`\`text
${result.summary.lineageTrace}
\`\`\`

## Actionable Rejection Advice
${result.summary.actionableRejectionAdvice || 'None'}

## Serialized Trace Footprint
\`\`\`text
${result.bundle.serializedTraceFootprint}
\`\`\`
`;
  fs.writeFileSync(
    path.join(liveDir, 'live_summary.md'),
    mdContent,
    'utf-8'
  );

  // 3. live_differential_summary.json
  fs.writeFileSync(
    path.join(liveDir, 'live_differential_summary.json'),
    JSON.stringify(result.bundle.differentialSummary, null, 2),
    'utf-8'
  );

  // 4. live_trace_footprint.txt
  fs.writeFileSync(
    path.join(liveDir, 'live_trace_footprint.txt'),
    result.bundle.serializedTraceFootprint,
    'utf-8'
  );

  // 5. live_lineage_trace.txt
  fs.writeFileSync(
    path.join(liveDir, 'live_lineage_trace.txt'),
    result.summary.lineageTrace,
    'utf-8'
  );
}

test.describe('RV.3A — Controlled Juice Shop Operational Validation Spec', () => {
  let runtime: PlaywrightMultiSessionRuntime;
  let interceptor: LivePerturbationInterceptor;
  let validator: JuiceShopOperationalValidator;

  const safetyProfile: TargetSafetyProfile = {
    targetId: 'rv3a-juice-safety',
    safeCategories: [{ categoryId: 'safe-reads', allowedClasses: ['READ_ONLY'] }],
    requiresApprovalFor: []
  };

  const boundary: SessionIsolationBoundary = {
    boundaryId: 'bnd_juice',
    enforceClearCookies: true,
    enforceClearLocalStorage: true,
    enforceClearSessionStorage: true,
    incognitoContext: true
  };

  test.beforeEach(() => {
    runtime = new PlaywrightMultiSessionRuntime(safetyProfile);
    interceptor = new LivePerturbationInterceptor();
    validator = new JuiceShopOperationalValidator(runtime, interceptor);
  });

  test.afterEach(async () => {
    await runtime.terminateAll();
  });

  test('1. Basket Access workflow differential validation', async () => {
    const targetRole = {
      roleId: 'juice_user_b',
      roleName: 'Standard User B',
      tenantContext: { tenantId: 't-b', tenantName: 'Tenant B', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const originalExchange = createJuiceExchange({
      id: 'ex_basket_user_a',
      sessionId: 'juice_user_a',
      url: 'http://localhost:3000/rest/basket/1',
      status: 200,
      bodyStr: '{"id": 1, "products": []}'
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_basket_idor',
      originalExecutionId: 'original',
      mutations: [{ type: 'IDOR_INJECT', targetParam: 'url_path', injectedValue: '1' }]
    };

    const result = await validator.validateWorkflow(
      'Basket IDOR Access',
      originalExchange,
      targetRole,
      boundary,
      plan,
      () => {
        return {
          status: 200,
          headers: { 'content-type': 'application/json' },
          bodyStr: '{"id": 1, "products": []}'
        };
      }
    );

    exportArtifacts('juice_shop_basket_idor', result);
    exportLiveArtifacts(result);

    expect(result.isVulnerable).toBe(true);
    expect(result.bundle.differentialSummary.crossTenantDataLeaked).toBe(true);
    expect(result.bundle.differentialSummary.boundaryDivergenceDetails).toContain('Cross-tenant data exposure');
    expect(result.bundle.differentialSummary.workflowDivergenceSignals[0].stepId).toBe('cross_tenant_data_leak');
  });

  test('2. Invoice Download parameter cross-user IDOR validation', async () => {
    const targetRole = {
      roleId: 'juice_user_b',
      roleName: 'Standard User B',
      tenantContext: { tenantId: 't-b', tenantName: 'Tenant B', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const originalExchange = createJuiceExchange({
      id: 'ex_invoice_user_a',
      sessionId: 'juice_user_a',
      url: 'http://localhost:3000/api/invoice/1005',
      status: 200,
      bodyStr: '{"invoiceId": 1005, "owner": "user_a"}'
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_invoice_idor',
      originalExecutionId: 'original',
      mutations: [{ type: 'IDOR_INJECT', targetParam: 'url_path', injectedValue: '1005' }]
    };

    const result = await validator.validateWorkflow(
      'Invoice Retrieval IDOR',
      originalExchange,
      targetRole,
      boundary,
      plan,
      () => {
        return {
          status: 200,
          headers: { 'content-type': 'application/json' },
          bodyStr: '{"invoiceId": 1005, "owner": "user_a"}'
        };
      }
    );

    exportArtifacts('juice_shop_invoice_idor', result);

    expect(result.isVulnerable).toBe(true);
    expect(result.bundle.differentialSummary.crossTenantDataLeaked).toBe(true);
    expect(result.bundle.differentialSummary.workflowDivergenceSignals[0].stepId).toBe('cross_tenant_data_leak');
  });

  test('3. Hidden Admin Dashboard workflow boundary breach validation', async () => {
    const targetRole = {
      roleId: 'juice_anonymous',
      roleName: 'Anonymous Visitor',
      tenantContext: { tenantId: 't-anon', tenantName: 'Anonymous', isolationLevel: 'DEDICATED' }
    } as RuntimeRoleProfile;

    const originalExchange = createJuiceExchange({
      id: 'ex_admin_restricted',
      sessionId: 'juice_anonymous',
      url: 'http://localhost:3000/api/administration',
      status: 403,
      bodyStr: '{"error":"unauthorized"}'
    });

    const plan: ReplayMutationPlan = {
      planId: 'mut_admin_bac',
      originalExecutionId: 'original',
      mutations: [{ type: 'AUTH_STRIP', targetHeader: 'cookie' }]
    };

    const result = await validator.validateWorkflow(
      'Administrative Dashboard BAC',
      originalExchange,
      targetRole,
      boundary,
      plan,
      () => {
        return {
          status: 200,
          headers: { 'content-type': 'application/json' },
          bodyStr: '{"adminDashboard": "unlocked"}'
        };
      }
    );

    exportArtifacts('juice_shop_admin_bac', result);

    expect(result.isVulnerable).toBe(true);
    expect(result.bundle.differentialSummary.isPrivilegeBoundaryViolated).toBe(true);
    expect(result.bundle.differentialSummary.boundaryDivergenceDetails).toContain('Privilege boundary collapse');
    expect(result.bundle.differentialSummary.workflowDivergenceSignals[0].stepId).toBe('hidden_admin_workflow_exposure');
    expect(result.bundle.differentialSummary.workflowDivergenceSignals[1].stepId).toBe('privilege_boundary_collapse');
  });
});
