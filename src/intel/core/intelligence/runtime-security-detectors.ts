import { SecurityFinding } from '../../models/schema';
import { NormalizedEvent } from './normalized-event-bus';

export class RuntimeSecurityDetectors {
  public detect(events: NormalizedEvent[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    const runtimeEvents = events.filter((e) => e.type === 'runtime' || e.type === 'dom.mutation' || e.type === 'storage');
    const hasEval = runtimeEvents.some((e) => /eval|new Function/i.test(JSON.stringify(e.data)));
    if (hasEval) {
      findings.push(this.mk('runtime:eval', 'client-runtime', 'high', 'Dynamic code execution primitive observed', 'CWE-95', runtimeEvents));
    }

    const innerHtml = runtimeEvents.filter((e) => /innerHTML|outerHTML|insertAdjacentHTML/i.test(JSON.stringify(e.data)));
    if (innerHtml.length) {
      findings.push(this.mk('runtime:domsink', 'xss-surface', 'medium', 'Dangerous DOM sink usage observed', 'CWE-79', innerHtml));
    }

    const tokenStorage = events.filter((e) => e.type === 'storage' && /token|jwt|auth|session/i.test(JSON.stringify(e.data)));
    if (tokenStorage.length) {
      findings.push(this.mk('runtime:token-storage', 'token-leakage', 'medium', 'Auth token-like values written to browser storage', 'CWE-922', tokenStorage));
    }

    const postMessageWildcard = runtimeEvents.filter((e) => /postMessage/i.test(JSON.stringify(e.data)) && /\*/.test(JSON.stringify(e.data)));
    if (postMessageWildcard.length) {
      findings.push(this.mk('runtime:postmessage', 'cross-origin-messaging', 'medium', 'postMessage with wildcard target origin detected', 'CWE-346', postMessageWildcard));
    }

    const debugFlags = runtimeEvents.filter((e) => /debug|devtools|__admin|featureflag|beta/i.test(JSON.stringify(e.data)));
    if (debugFlags.length) {
      findings.push(this.mk('runtime:debug-surface', 'hidden-surface', 'low', 'Debug/feature-flag markers observed in runtime', undefined, debugFlags));
    }

    return findings;
  }

  private mk(id: string, category: string, severity: SecurityFinding['severity'], title: string, cwe: string | undefined, evts: NormalizedEvent[]): SecurityFinding {
    return {
      id,
      category,
      severity,
      title,
      evidence: evts.slice(0, 8).map((e) => `${e.id}:${e.type}`),
      recommendation: 'Validate exploitability with targeted manual verification and server-side controls review.',
      cwe,
      confidence: Math.min(0.9, 0.45 + evts.length * 0.05),
    };
  }
}
