import { ExplorationBudget } from './exploration-budget';
import { InvestigationWorkspace } from '../../models/workspace/investigation-workspace';
import { InvestigationStatus } from '../../models/workspace/investigation-state';

export enum ExplorationConfidenceLevel {
  LEVEL_1_LOW = 1,
  LEVEL_2_MEDIUM = 2,
  LEVEL_3_HIGH = 3
}

/**
 * Autonomous Explorer.
 * Executes Progressive Exploration Strategy.
 * Strictly Sequential role orchestration.
 */
export class AutonomousExplorer {
  private budget: ExplorationBudget;
  private workspace: InvestigationWorkspace;

  constructor(workspace: InvestigationWorkspace, budget: ExplorationBudget) {
    this.workspace = workspace;
    this.budget = budget;
  }

  public async runExploration(
    roles: string[], 
    graphConfidenceScore: number, 
    onAction: (role: string, actionType: string) => Promise<boolean> // Mock runner callback
  ): Promise<void> {

    const level = this.determineExplorationLevel(graphConfidenceScore);

    // Strictly Sequential execution to preserve pure canonical lineage determinism
    for (const roleId of roles) {
      
      let depth = 0;
      let exploring = true;

      while (exploring) {
        const exhaustCheck = this.budget.isExhausted(roleId);
        if (exhaustCheck.exhausted) {
          break;
        }

        // Deterministic strategy based on confidence level
        let actionType = 'CONSERVATIVE_REQUEST_TRAVERSAL';
        if (level >= ExplorationConfidenceLevel.LEVEL_2_MEDIUM) {
           actionType = 'ENTITY_RELATIONSHIP_TRAVERSAL';
        }
        if (level >= ExplorationConfidenceLevel.LEVEL_3_HIGH) {
           actionType = 'FULL_DIFFERENTIAL_EXPANSION';
        }

        const success = await onAction(roleId, actionType);
        this.budget.recordRequest(roleId);

        if (!success) {
           // Evidence stagnation logic could go here
           exploring = false; 
        }

        depth++;
        this.budget.recordDepth(depth);
      }
    }
  }

  private determineExplorationLevel(confidence: number): ExplorationConfidenceLevel {
    if (confidence >= 0.8) return ExplorationConfidenceLevel.LEVEL_3_HIGH;
    if (confidence >= 0.5) return ExplorationConfidenceLevel.LEVEL_2_MEDIUM;
    return ExplorationConfidenceLevel.LEVEL_1_LOW;
  }
}
