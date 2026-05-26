export interface WorkflowRiskSignals {
  crossesBoundary: boolean;
  containsAdminEntity: boolean;
  containsTenantBoundary: boolean;
  containsAuthEntity: boolean;
  containsExternalEntity: boolean;
}
