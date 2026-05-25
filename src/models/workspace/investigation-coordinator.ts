import { InvestigationWorkspace } from './investigation-workspace';
import { InvestigationStatus } from './investigation-state';
import * as fs from 'fs';
import * as path from 'path';

/**
 * The Stateless Router.
 * Coordinators coordinate. Coordinators never become engines.
 * 
 * Responsibilities:
 * - State transitions
 * - Checkpoint persistence (Replay Seed, Graph State, Evidence Lineage only)
 * - Dispatching to external engines
 * 
 * MUST NOT:
 * - Evaluate candidates
 * - Traverse graphs
 * - Generate mutations
 * - Score confidence
 */
export class InvestigationCoordinator {
  private workspace: InvestigationWorkspace;
  private checkpointDir: string;

  constructor(workspace: InvestigationWorkspace, baseOutputDir: string) {
    this.workspace = workspace;
    this.checkpointDir = path.join(baseOutputDir, workspace.workspaceId, 'checkpoints');
    fs.mkdirSync(this.checkpointDir, { recursive: true });
  }

  /**
   * Advances the state machine and persists a checkpoint.
   */
  public transitionState(newStatus: InvestigationStatus, checkpointData?: any) {
    this.workspace.updateState({ status: newStatus });
    

    if (checkpointData) {
      this.persistCheckpoint(checkpointData);
    }
  }

  /**
   * Checkpoints strictly bounded canonical truth.
   * NO browser states, cookies, or local storage.
   */
  private persistCheckpoint(data: {
    replaySeed: string;
    graphState: any; // Simplified for template
    evidenceLineage: any; // Simplified for template
  }) {
    const timestamp = Date.now();
    const checkpointFile = path.join(this.checkpointDir, `checkpoint_${timestamp}.json`);
    
    // In a real implementation, we extract the minimal canonical structures
    const payload = {
      workspaceState: this.workspace.state,
      replaySeed: data.replaySeed,
      graphState: data.graphState,
      evidenceLineage: data.evidenceLineage
    };

    fs.writeFileSync(checkpointFile, JSON.stringify(payload, null, 2), 'utf-8');
  }

  // Dispatch methods (e.g. runExploration, runTesting) would simply invoke the corresponding
  // engine classes and then call transitionState upon their return. They do not contain the logic.
}
