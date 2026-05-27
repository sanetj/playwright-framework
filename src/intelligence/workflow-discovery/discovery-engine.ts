import { ActionGraph } from '../../graph/action-graph';
import { WorkflowEntity, WorkflowTransition, WorkflowBoundary } from '../workflow-models/workflow-entities';
import { WorkflowEntityCategory, WorkflowTransitionType, WorkflowBoundaryType } from '../workflow-models/workflow-classification';
import { AUTH_PATTERNS, ROLE_PATTERNS, TENANT_PATTERNS, PAYMENT_PATTERNS, RESOURCE_PATTERNS } from './workflow-patterns';
import { WorkflowRiskSignals } from '../workflow-models/workflow-risk-signals';

export interface WorkflowDiscoveryResult {
  entities: WorkflowEntity[];
  transitions: WorkflowTransition[];
  boundaries: WorkflowBoundary[];
  riskSignals: WorkflowRiskSignals;
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

  public extractRiskSignals(
    entities: WorkflowEntity[],
    boundaries: WorkflowBoundary[]
  ): WorkflowRiskSignals {
    const crossesBoundary = boundaries.length > 0;
    const containsAdminEntity = entities.some(e => e.category === WorkflowEntityCategory.ADMIN);
    const containsTenantBoundary = boundaries.some(b => b.boundaryType === WorkflowBoundaryType.TENANT);
    const containsAuthEntity = entities.some(e => e.category === WorkflowEntityCategory.AUTH);
    const containsExternalEntity = entities.some(e => e.category === WorkflowEntityCategory.EXTERNAL);

    const exploitSignals: Required<WorkflowRiskSignals>['exploitSignals'] = [];

    // Rule 1: CROSS_ROLE_TRANSITION - when admin and auth categories are co-located or traversed
    if (containsAdminEntity && containsAuthEntity) {
      exploitSignals.push({
        type: 'CROSS_ROLE_TRANSITION',
        evidenceLinks: entities
          .filter(e => e.category === WorkflowEntityCategory.ADMIN || e.category === WorkflowEntityCategory.AUTH)
          .map(e => `entity:${e.id}`)
      });
    }

    // Rule 2: TRUST_BOUNDARY_CROSSING - when any structural boundary is Crossed
    if (crossesBoundary) {
      exploitSignals.push({
        type: 'TRUST_BOUNDARY_CROSSING',
        evidenceLinks: boundaries.map(b => `boundary:${b.id}`)
      });
    }

    // Rule 3: SUSPICIOUS_MULTI_BOUNDARY_FLOW - when both Tenant and Role boundaries are present
    if (containsTenantBoundary && boundaries.some(b => b.boundaryType === WorkflowBoundaryType.ROLE)) {
      exploitSignals.push({
        type: 'SUSPICIOUS_MULTI_BOUNDARY_FLOW',
        evidenceLinks: boundaries.map(b => `boundary:${b.id}`)
      });
    }

    return {
      crossesBoundary,
      containsAdminEntity,
      containsTenantBoundary,
      containsAuthEntity,
      containsExternalEntity,
      exploitSignals
    };
  }

  public discover(graph: ActionGraph): WorkflowDiscoveryResult {
    const entities = this.extractEntities(graph);
    const transitions = this.extractTransitions(graph);
    const boundaries = this.extractBoundaries(entities);
    const riskSignals = this.extractRiskSignals(entities, boundaries);

    return {
      entities,
      transitions,
      boundaries,
      riskSignals
    };
  }
}
