/**
 * @canonical
 * Phase 9.3 Workflow Classification enums
 * Declares domain categories, transitions, and boundaries for classification rules.
 */

export enum WorkflowEntityCategory {
  AUTH = 'AUTH',
  TENANT = 'TENANT',
  ADMIN = 'ADMIN',
  RESOURCE = 'RESOURCE',
  PAYMENT = 'PAYMENT',
  WORKFLOW = 'WORKFLOW',
  EXTERNAL = 'EXTERNAL',
}

export enum WorkflowTransitionType {
  NAVIGATION = 'NAVIGATION',
  API_CALL = 'API_CALL',
  STATE_CHANGE = 'STATE_CHANGE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
}

export enum WorkflowBoundaryType {
  ROLE = 'ROLE',
  TENANT = 'TENANT',
  ORGANIZATION = 'ORGANIZATION',
  ENVIRONMENT = 'ENVIRONMENT',
}
