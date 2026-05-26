import { ActionGraph } from '../../graph/action-graph';
import { WorkflowEntity, WorkflowTransition, WorkflowBoundary } from '../workflow-models/workflow-entities';
import { WorkflowEntityCategory } from '../workflow-models/workflow-classification';
import { AUTH_PATTERNS, ROLE_PATTERNS, TENANT_PATTERNS, PAYMENT_PATTERNS, RESOURCE_PATTERNS } from './workflow-patterns';

export interface WorkflowDiscoveryResult {
  entities: WorkflowEntity[];
  transitions: WorkflowTransition[];
  boundaries: WorkflowBoundary[];
}

export class WorkflowDiscoveryEngine {
  public classifyNodeCategory(label: string): WorkflowEntityCategory {
    const lowerLabel = label.toLowerCase();
    if (AUTH_PATTERNS.some(p => lowerLabel.includes(p.toLowerCase()))) {
      return WorkflowEntityCategory.AUTH;
    }
    if (ROLE_PATTERNS.some(p => lowerLabel.includes(p.toLowerCase()))) {
      return WorkflowEntityCategory.ADMIN;
    }
    if (TENANT_PATTERNS.some(p => lowerLabel.includes(p.toLowerCase()))) {
      return WorkflowEntityCategory.TENANT;
    }
    if (PAYMENT_PATTERNS.some(p => lowerLabel.includes(p.toLowerCase()))) {
      return WorkflowEntityCategory.PAYMENT;
    }
    if (RESOURCE_PATTERNS.some(p => lowerLabel.includes(p.toLowerCase()))) {
      return WorkflowEntityCategory.RESOURCE;
    }
    return WorkflowEntityCategory.UNKNOWN;
  }

  public extractEntities(graph: ActionGraph): WorkflowEntity[] {
    const { nodes } = graph.toJSON();
    return nodes.map(node => {
      const category = this.classifyNodeCategory(node.label || node.id);
      return {
        id: `wf_ent_${node.id}`,
        name: node.label || node.id,
        category,
        sourceNodeIds: [node.id]
      };
    });
  }

  public extractTransitions(graph: ActionGraph): WorkflowTransition[] {
    const { edges } = graph.toJSON();
    return edges.map(edge => ({
      fromEntityId: `wf_ent_${edge.from}`,
      toEntityId: `wf_ent_${edge.to}`,
      transitionType: 'NAVIGATION'
    }));
  }

  public discover(graph: ActionGraph): WorkflowDiscoveryResult {
    const entities = this.extractEntities(graph);
    const transitions = this.extractTransitions(graph);
    return {
      entities,
      transitions,
      boundaries: []
    };
  }
}
