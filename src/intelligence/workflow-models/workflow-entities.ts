/**
 * @canonical
 * Phase 9.3 Workflow Intelligence Foundation Contracts
 * Declares structural entities representing business workflow steps discovered from action graphs.
 */

export interface WorkflowEntity {
  id: string;
  name: string;
  category: string;
  sourceNodeIds: string[];
}

export interface WorkflowTransition {
  fromEntityId: string;
  toEntityId: string;
  transitionType: string;
}

export interface WorkflowBoundary {
  id: string;
  boundaryType: string;
  entityIds: string[];
}
