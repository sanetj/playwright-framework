/**
 * Safe local target configurations for Reality Validation Phase 1 (RV.1A).
 * All structures are deep-frozen and deterministic.
 */

export interface LabTargetConfig {
  readonly targetName: string;
  readonly baseUrl: string;
  readonly allowedVerbs: ReadonlyArray<string>;
  readonly roleProfiles: ReadonlyArray<{
    readonly roleId: string;
    readonly roleName: string;
  }>;
}

export const OWASP_JUICE_SHOP_LAB: LabTargetConfig = Object.freeze({
  targetName: 'OWASP Juice Shop',
  baseUrl: 'http://localhost:3000',
  allowedVerbs: Object.freeze(['GET', 'HEAD', 'OPTIONS']),
  roleProfiles: Object.freeze([
    Object.freeze({ roleId: 'juice_admin', roleName: 'Administrator' }),
    Object.freeze({ roleId: 'juice_user', roleName: 'Standard User' }),
    Object.freeze({ roleId: 'juice_anonymous', roleName: 'Anonymous Visitor' })
  ])
});

export const PORTSWIGGER_LAB: LabTargetConfig = Object.freeze({
  targetName: 'PortSwigger Labs',
  baseUrl: 'http://127.0.0.1:8080',
  allowedVerbs: Object.freeze(['GET', 'HEAD', 'OPTIONS']),
  roleProfiles: Object.freeze([
    Object.freeze({ roleId: 'portswigger_user1', roleName: 'User Account A' }),
    Object.freeze({ roleId: 'portswigger_user2', roleName: 'User Account B' })
  ])
});

export const LOCAL_INTENTIONAL_LAB: LabTargetConfig = Object.freeze({
  targetName: 'Local Intentionally Vulnerable App',
  baseUrl: 'http://localhost:8081',
  allowedVerbs: Object.freeze(['GET', 'HEAD', 'OPTIONS']),
  roleProfiles: Object.freeze([
    Object.freeze({ roleId: 'lab_admin', roleName: 'Lab Admin' }),
    Object.freeze({ roleId: 'lab_user', roleName: 'Lab User' })
  ])
});

export const RV1_LAB_CONFIGS: ReadonlyMap<string, LabTargetConfig> = new Map([
  ['juice-shop', OWASP_JUICE_SHOP_LAB],
  ['portswigger', PORTSWIGGER_LAB],
  ['local-intentional', LOCAL_INTENTIONAL_LAB]
]);
