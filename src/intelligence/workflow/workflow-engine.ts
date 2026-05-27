import { NormalizedEvent } from '../events/normalized-event';

export interface InferredWorkflow {
  id: string;
  name: string;
  chain: string[];
  prerequisites: string[];
  successStates: string[];
  failureStates: string[];
  hiddenSteps: string[];
  mermaid: string;
}

/**
 * @deprecated Legacy event-based workflow inference engine. 
 * Use the canonical ActionGraph-backed WorkflowAnalysisPipeline in src/intelligence/workflow-analysis/ instead.
 */
export class WorkflowEngine {
  infer(events: NormalizedEvent[]): InferredWorkflow[] {
    const chunks = this.chunkByCausality(events);
    return chunks.map((chunk, i) => this.toWorkflow(chunk, i + 1)).filter((w): w is InferredWorkflow => !!w);
  }

  private chunkByCausality(events: NormalizedEvent[]): NormalizedEvent[][] {
    const chunks: NormalizedEvent[][] = [];
    let cur: NormalizedEvent[] = [];
    for (const e of events) {
      cur.push(e);
      if (['auth_change', 'form_submit', 'api_response'].includes(e.type) && cur.length >= 4) { chunks.push(cur); cur = []; }
    }
    if (cur.length >= 3) chunks.push(cur);
    return chunks;
  }

  private toWorkflow(chunk: NormalizedEvent[], idx: number): InferredWorkflow | undefined {
    const joined = chunk.map((e) => `${e.type}:${JSON.stringify(e.payload)}`).join(' ').toLowerCase();
    const name = /login|signin|token/.test(joined) ? 'login-flow' : /checkout|payment|invoice|wallet/.test(joined) ? 'checkout-flow' : /admin|role|permission/.test(joined) ? 'admin-flow' : /create|update|delete/.test(joined) ? 'crud-flow' : undefined;
    if (!name) return undefined;
    const chain = chunk.map((e) => `${e.type}@${e.route.path}`);
    const prerequisites = chunk.filter((e) => e.type === 'click' || e.type === 'input').map((e) => e.id);
    const successStates = chunk.filter((e) => /200|success|welcome|ok/.test(JSON.stringify(e.payload).toLowerCase())).map((e) => e.afterState ?? e.id);
    const failureStates = chunk.filter((e) => /403|401|error|fail|denied/.test(JSON.stringify(e.payload).toLowerCase())).map((e) => e.afterState ?? e.id);
    const hiddenSteps = chunk.filter((e) => /redirect|callback|mfa|csrf/.test(JSON.stringify(e.payload).toLowerCase())).map((e) => e.id);
    const mermaid = ['flowchart TD', ...chain.map((c, i) => i ? `  s${idx}_${i-1} --> s${idx}_${i}["${c}"]` : `  s${idx}_0["${c}"]`)].join('\n');
    return { id: `wf_${idx}`, name, chain, prerequisites, successStates, failureStates, hiddenSteps, mermaid };
  }
}
