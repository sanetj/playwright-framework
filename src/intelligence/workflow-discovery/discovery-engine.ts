import { ActionGraph } from '../../graph/action-graph';
import { WorkflowEntity, WorkflowTransition, WorkflowBoundary } from '../workflow-models/workflow-entities';
import { WorkflowEntityCategory, WorkflowTransitionType, WorkflowBoundaryType } from '../workflow-models/workflow-classification';
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
      transitionType: WorkflowTransitionType.NAVIGATION
    }));
  }

  public extractBoundaries(
    entities: WorkflowEntity[]
  ): WorkflowBoundary[] {
    const boundaries: WorkflowBoundary[] = [];

    const roleEntityIds = entities
      .filter(e => e.category === WorkflowEntityCategory.ADMIN || e.category === WorkflowEntityCategory.AUTH)
      .map(e => e.id);

    if (roleEntityIds.length > 0) {
      boundaries.push({
        id: 'wf_bnd_role',
        boundaryType: WorkflowBoundaryType.ROLE,
        entityIds: roleEntityIds
      });
    }

    const tenantEntityIds = entities
      .filter(e => e.category === WorkflowEntityCategory.TENANT)
      .map(e => e.id);

    if (tenantEntityIds.length > 0) {
      boundaries.push({
        id: 'wf_bnd_tenant',
        boundaryType: WorkflowBoundaryType.TENANT,
        entityIds: tenantEntityIds
      });
    }

    return boundaries;
  }

  public discover(graph: ActionGraph): WorkflowDiscoveryResult {
    const entities = this.extractEntities(graph);
    const transitions = this.extractTransitions(graph);
    const boundaries = this.extractBoundaries(entities);

    return {
      entities,
      transitions,
      boundaries
    };
  }
}
