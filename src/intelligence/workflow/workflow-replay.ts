import { InferredWorkflow } from './workflow-engine';

export interface ReplayStep { index: number; type: string; route: string; payloadHint: string; expectedState?: string; }
export interface ReplayValidationResult { drift: boolean; missingTransitions: string[]; confidence: number; }

export class WorkflowReplay {
  public toReplayChain(workflow: InferredWorkflow): ReplayStep[] {
    const steps: ReplayStep[] = workflow.chain.map((step, index) => {
      const [type, route] = step.split('@');
      return { index, type, route, payloadHint: `${type}:${route}`, expectedState: workflow.successStates[index] };
    });
    return this.suppressDuplicates(steps);
  }

  public replayScore(workflow: InferredWorkflow): number {
    const determinism = Math.max(0, 1 - workflow.hiddenSteps.length * 0.1);
    const failures = workflow.failureStates.length > 0 ? 0.8 : 1;
    const lengthFactor = Math.min(1, Math.max(0.35, workflow.chain.length / 8));
    const uniquenessFactor = this.toReplayChain(workflow).length / Math.max(1, workflow.chain.length);
    return Number((determinism * failures * lengthFactor * uniquenessFactor * 100).toFixed(2));
  }

  public validateReplay(observedChain: string[], workflow: InferredWorkflow): ReplayValidationResult {
    const expected = this.toReplayChain(workflow).map((s) => `${s.type}@${s.route}`);
    const missing = expected.filter((step) => !observedChain.includes(step));
    const drift = missing.length > Math.max(1, expected.length * 0.25);
    const confidence = Math.max(0, 100 - missing.length * 12);
    return { drift, missingTransitions: missing, confidence };
  }

  private suppressDuplicates(steps: ReplayStep[]): ReplayStep[] {
    const out: ReplayStep[] = [];
    let last = '';
    for (const s of steps) {
      const sig = `${s.type}@${s.route}`;
      if (sig === last) continue;
      out.push(s);
      last = sig;
    }
    return out;
  }
}
