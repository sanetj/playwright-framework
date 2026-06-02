/**
 * @canonical
 * Phase 10.5A Bounded Type Isolation
 * Canonical, single-source-of-truth definition for authorization vectors.
 */

export type AuthorizationVector = 'IDOR' | 'BAC' | 'TENANT_ISOLATION';
