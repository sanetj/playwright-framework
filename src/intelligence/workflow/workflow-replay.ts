import { InferredWorkflow } from './workflow-engine';

export interface ReplayStep { type: string; route: string; payloadHint: string; }

export class WorkflowReplay {
  public toReplayChain(workflow: InferredWorkflow): ReplayStep[] {
    return workflow.chain.map((step) => {
      const [type, route] = step.split('@');
      return { type, route, payloadHint: `${type}:${route}` };
    });
  }

  public replayScore(workflow: InferredWorkflow): number {
    const determinism = Math.max(0, 1 - workflow.hiddenSteps.length * 0.1);
    const failures = workflow.failureStates.length > 0 ? 0.8 : 1;
    const lengthFactor = Math.min(1, workflow.chain.length / 8);
    return Number((determinism * failures * lengthFactor * 100).toFixed(2));
  }
}
