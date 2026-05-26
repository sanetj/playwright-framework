import { InvestigationCandidate, CandidateState } from '../../models/candidate/candidate-lifecycle';
import { WorkflowDiscoveryResult } from '../workflow-discovery/discovery-engine';
import { WorkflowEntity, WorkflowBoundary } from '../workflow-models/workflow-entities';

export class WorkflowCandidateGenerator {
  public generate(
    workflowResult: WorkflowDiscoveryResult
  ): InvestigationCandidate[] {
    return [];
  }

  public generateFromWorkflowEntities(
    entities: WorkflowEntity[]
  ): InvestigationCandidate[] {
    return entities.map(entity => ({
      id: this.generateCandidateId(entity),
      type: 'WorkflowGap',
      state: CandidateState.DISCOVERED,
      transformationRule: 'WorkflowDiscoveryRule',
      targetNodeId: entity.id,
      attackerRoleId: 'unknown',
      victimRoleId: 'unknown',
      createdAt: 1716666666000,
      evidenceLinks: []
    }));
  }

  private generateCandidateId(
    entity: WorkflowEntity,
    boundary?: WorkflowBoundary
  ): string {
    const boundaryPart = boundary ? `_${boundary.id}` : '';
    return `wf_${entity.id}${boundaryPart}`;
  }
}
