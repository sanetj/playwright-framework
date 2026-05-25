import { InvestigationState, createInitialState } from './investigation-state';
import { RuntimeRoleProfile } from '../../runtime/multi-session-runtime'; // Ensure path aligns with the actual framework, typically in runtime

export interface TargetConfig {
  baseUrl: string;
  scopeRules: string[]; // e.g., ['/api/*', '!/api/logout']
}

export interface EnvironmentProfile {
  browser: string;
  viewport: string;
  networkConditions: string;
}

/**
 * The InvestigationWorkspace is the true entry point and Project File.
 * 1 Workspace = 1 KnowledgeGraph = 1 Target.
 * Once the bundle is exported, this workspace and its knowledge are disposable.
 */
export class InvestigationWorkspace {
  public readonly workspaceId: string;
  public readonly target: TargetConfig;
  public roles: RuntimeRoleProfile[] = [];
  public workflowHints: string[] = [];
  public readonly environmentProfile: EnvironmentProfile;
  
  public state: InvestigationState;

  constructor(
    workspaceId: string,
    target: TargetConfig,
    environmentProfile: EnvironmentProfile
  ) {
    this.workspaceId = workspaceId;
    this.target = target;
    this.environmentProfile = environmentProfile;
    this.state = createInitialState(workspaceId);
  }

  public addRole(role: RuntimeRoleProfile) {
    this.roles.push(role);
  }

  public addWorkflowHints(hints: string[]) {
    this.workflowHints.push(...hints);
  }

  public updateState(newState: Partial<InvestigationState>) {
    this.state = {
      ...this.state,
      ...newState,
      lastUpdatedAt: Date.now()
    };
  }
}
