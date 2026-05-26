import { InvestigationCandidate } from '../../models/candidate/candidate-lifecycle';
import { WorkflowDiscoveryResult } from '../workflow-discovery/discovery-engine';

export class WorkflowCandidateGenerator {
  public generate(
    workflowResult: WorkflowDiscoveryResult
  ): InvestigationCandidate[] {
    return [];
  }
}
