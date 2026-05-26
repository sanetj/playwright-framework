/**
 * @canonical
 * Phase 9.3 Workflow Discovery Patterns
 * Declares deterministic route/API pattern lists for workflow classification rules.
 */

export const AUTH_PATTERNS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/auth/token'
];

export const ROLE_PATTERNS = [
  '/api/roles',
  '/api/permissions',
  '/api/admin/roles',
  '/api/admin/permissions'
];

export const TENANT_PATTERNS = [
  '/api/tenant/settings',
  '/api/tenant/billing',
  '/api/tenant/members',
  '/api/tenant/profile'
];

export const PAYMENT_PATTERNS = [
  '/api/checkout',
  '/api/payment/methods',
  '/api/payment/charge',
  '/api/payment/refund',
  '/api/subscriptions'
];

export const RESOURCE_PATTERNS = [
  '/api/products',
  '/api/orders',
  '/api/items',
  '/api/cart',
  '/api/search'
];
