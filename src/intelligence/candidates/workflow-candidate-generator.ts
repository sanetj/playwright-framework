import { InvestigationCandidate, CandidateState } from '../../models/candidate/candidate-lifecycle';
import { WorkflowDiscoveryResult } from '../workflow-discovery/discovery-engine';
import { WorkflowEntity, WorkflowBoundary } from '../workflow-models/workflow-entities';
import { WorkflowRiskSignals } from '../workflow-models/workflow-risk-signals';
import { WorkflowEvidence } from '../workflow-analysis/workflow-evidence';

export class WorkflowCandidateGenerator {
  public generate(
    workflowResult: WorkflowDiscoveryResult,
    riskSignals?: WorkflowRiskSignals
  ): InvestigationCandidate[] {
    return [];
  }

  public generateFromWorkflowEntities(
    entities: WorkflowEntity[],
    riskSignals?: WorkflowRiskSignals
  ): InvestigationCandidate[] {
    return entities.map(entity => {
      const ruleEvidence = riskSignals?.triggeredRuleIds?.map(id => `workflow-rule:${id}`) ?? [];
      return {
        id: this.generateCandidateId(entity),
        type: 'WorkflowGap',
        state: CandidateState.DISCOVERED,
        transformationRule: 'WorkflowDiscoveryRule',
        targetNodeId: entity.id,
        attackerRoleId: 'unknown',
        victimRoleId: 'unknown',
        createdAt: 1716666666000,
        evidenceLinks: [...entity.sourceNodeIds, ...ruleEvidence]
      };
    });
  }

  /**
   * Deterministically generates an InvestigationCandidate from WorkflowEvidence.
   * Preserves exact input order without sorting or deduplication.
   */
  public generateFromWorkflowEvidence(
    entity: WorkflowEntity,
    evidence: WorkflowEvidence
  ): InvestigationCandidate {
    const evidenceLinks: string[] = [];

    if (evidence.pathId) {
      evidenceLinks.push(`path:${evidence.pathId}`);
    }
    for (const bId of evidence.boundaryIds) {
      evidenceLinks.push(`boundary:${bId}`);
    }
    for (const sig of evidence.riskSignals) {
      evidenceLinks.push(`signal:${sig}`);
    }
    for (const nId of evidence.sourceNodeIds) {
      evidenceLinks.push(`node:${nId}`);
    }

    return {
      id: this.generateCandidateId(entity),
      type: 'WorkflowGap',
      state: CandidateState.DISCOVERED,
      transformationRule: 'WorkflowDiscoveryRule',
      targetNodeId: entity.id,
      attackerRoleId: 'unknown',
      victimRoleId: 'unknown',
      createdAt: 1716666666000,
      evidenceLinks
    };
  }

  private generateCandidateId(
    entity: WorkflowEntity,
    boundary?: WorkflowBoundary
  ): string {
    const boundaryPart = boundary ? `_${boundary.id}` : '';
    return `wf_${entity.id}${boundaryPart}`;
  }
}

