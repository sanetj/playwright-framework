import { ActionGraph } from './action-graph';
import { NormalizedEvent } from './normalized-event-bus';

export interface WorkflowModel {
  id: string;
  name: string;
  steps: string[];
  successSignals: string[];
  failureSignals: string[];
  requiredOrdering: string[];
  hiddenStepCandidates: string[];
  mermaid: string;
  summary: string;
}

export class WorkflowEngine {
  public infer(events: NormalizedEvent[], graph: ActionGraph): WorkflowModel[] {
    const chains = this.extractChains(events);
    const workflows: WorkflowModel[] = [];

    for (const chain of chains) {
      const label = chain.join(' ').toLowerCase();
      const name = this.labelWorkflow(label);
      if (!name) continue;

      const successSignals = events
        .filter((e) => /success|completed|welcome|confirmed|200/.test(JSON.stringify(e.data).toLowerCase()))
        .map((e) => e.id)
        .slice(0, 5);

      const failureSignals = events
        .filter((e) => /error|failed|forbidden|unauthorized|4\d\d|5\d\d/.test(JSON.stringify(e.data).toLowerCase()))
        .map((e) => e.id)
        .slice(0, 5);

      const hiddenStepCandidates = chain.filter((s) => /token|callback|redirect|verify|mfa/.test(s.toLowerCase()));
      const mermaid = this.chainToMermaid(name, chain);

      workflows.push({
        id: `wf_${workflows.length + 1}`,
        name,
        steps: chain,
        successSignals,
        failureSignals,
        requiredOrdering: [...chain],
        hiddenStepCandidates,
        mermaid,
        summary: `${name} appears as a ${chain.length}-step flow with ${successSignals.length} success and ${failureSignals.length} failure signal(s).`,
      });
    }

    const uniqueByName = new Map<string, WorkflowModel>();
    for (const wf of workflows) {
      if (!uniqueByName.has(wf.name) || uniqueByName.get(wf.name)!.steps.length < wf.steps.length) uniqueByName.set(wf.name, wf);
    }

    void graph;
    return [...uniqueByName.values()];
  }

  private extractChains(events: NormalizedEvent[]): string[][] {
    const chains: string[][] = [];
    let current: string[] = [];

    for (const e of events) {
      if (e.type === 'ui.action') current.push(String((e.data as Record<string, unknown>).action ?? 'ui-action'));
      if (e.type === 'navigation') current.push(String((e.data as Record<string, unknown>).to ?? e.ctx.pageUrl ?? 'route'));
      if (e.type === 'auth') current.push(`auth:${String((e.data as Record<string, unknown>).state ?? 'unknown')}`);

      if (current.length >= 4 && (e.type === 'auth' || e.type === 'network.response')) {
        chains.push(current);
        current = [];
      }
    }

    if (current.length >= 3) chains.push(current);
    return chains;
  }

  private labelWorkflow(joined: string): string | undefined {
    if (/login|signin|auth/.test(joined)) return 'login-flow';
    if (/checkout|cart|payment|invoice|billing/.test(joined)) return 'checkout-flow';
    if (/register|onboard|welcome/.test(joined)) return 'onboarding-flow';
    if (/reset|forgot|recovery/.test(joined)) return 'password-reset-flow';
    if (/admin|role|permission/.test(joined)) return 'admin-workflow';
    if (/create|update|delete|edit/.test(joined)) return 'crud-workflow';
    return undefined;
  }

  private chainToMermaid(name: string, steps: string[]): string {
    const lines = ['flowchart TD'];
    for (let i = 0; i < steps.length - 1; i++) lines.push(`  ${name}_${i}["${steps[i]}"] --> ${name}_${i + 1}["${steps[i + 1]}"]`);
    return lines.join('\n');
  }
}
