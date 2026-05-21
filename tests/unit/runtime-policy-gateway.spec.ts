import { test, expect } from '@playwright/test';
import { RuntimePolicyGateway, PolicyViolationError } from '../../src/runtime/governance/runtime-policy-gateway';
import { TargetSafetyProfile } from '../../src/intelligence/perturbation/probe-safety';
import { ReplayExecutionIntent } from '../../src/runtime/safety/replay-safety-classifier';

test.describe('RuntimePolicyGateway', () => {
  const safeProfile: TargetSafetyProfile = {
    targetId: 'test_target',
    safeCategories: [
      {
        categoryId: 'safe_reads',
        allowedClasses: ['READ_ONLY', 'LOW_IMPACT']
      }
    ],
    requiresApprovalFor: ['STATE_MUTATION', 'HIGH_RISK', 'CROSS_TENANT']
  };

  test('should authorize READ_ONLY intent', async () => {
    const gateway = new RuntimePolicyGateway(safeProfile);
    const intent: ReplayExecutionIntent = { method: 'GET', url: 'http://example.com/api/users', isMutationAttempt: false };
    
    await expect(gateway.authorize(intent)).resolves.toBeUndefined();
  });

  test('should reject STATE_MUTATION intent missing approval', async () => {
    const gateway = new RuntimePolicyGateway(safeProfile);
    const intent: ReplayExecutionIntent = { method: 'POST', url: 'http://example.com/api/users', isMutationAttempt: true };
    
    await expect(gateway.authorize(intent)).rejects.toThrow(PolicyViolationError);
  });

  test('should reject HIGH_RISK intent unconditionally without approval', async () => {
    const gateway = new RuntimePolicyGateway(safeProfile);
    const intent: ReplayExecutionIntent = { method: 'POST', url: 'http://example.com/api/billing/charge', isMutationAttempt: true };
    
    await expect(gateway.authorize(intent)).rejects.toThrow(/HIGH_RISK/);
  });
});
