import { ActionGraph } from '../../graph/action-graph';
import { WorkflowEntity, WorkflowTransition, WorkflowBoundary } from '../workflow-models/workflow-entities';

export interface WorkflowDiscoveryResult {
  entities: WorkflowEntity[];
  transitions: WorkflowTransition[];
  boundaries: WorkflowBoundary[];
}

export class WorkflowDiscoveryEngine {
  public discover(graph: ActionGraph): WorkflowDiscoveryResult {
    return {
      entities: [],
      transitions: [],
      boundaries: []
    };
  }
}
