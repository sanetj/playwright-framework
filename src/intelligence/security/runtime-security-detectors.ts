import { NormalizedEvent } from '../events/normalized-event';

export interface RuntimeSecurityFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  evidence: string[];
  confidence: number;
}

export class RuntimeSecurityDetectors {
  detect(events: NormalizedEvent[]): RuntimeSecurityFinding[] {
    const findings: RuntimeSecurityFinding[] = [];
    const str = (e: NormalizedEvent): string => JSON.stringify(e.payload).toLowerCase();

    const domSink = events.filter((e) => e.type === 'mutation' && /innerhtml|outerhtml|insertadjacenthtml/.test(str(e)));
    if (domSink.length) findings.push(this.f('dom_sink', 'high', 'xss', 'Dangerous DOM sink usage detected', domSink));

    const evalUse = events.filter((e) => /eval|new function/.test(str(e)));
    if (evalUse.length) findings.push(this.f('eval', 'high', 'code_exec', 'Dynamic code execution primitive observed', evalUse));

    const tokenStorage = events.filter((e) => e.type === 'storage_access' && /token|jwt|auth|session/.test(str(e)));
    if (tokenStorage.length) findings.push(this.f('token_storage', 'medium', 'token_exposure', 'Auth artifacts stored client-side', tokenStorage));

    const postMessageAny = events.filter((e) => /postmessage/.test(str(e)) && /"\*"|\*/.test(str(e)));
    if (postMessageAny.length) findings.push(this.f('postmessage_any', 'medium', 'origin_trust', 'postMessage wildcard target detected', postMessageAny));

    const runtimeErr = events.filter((e) => e.type === 'runtime_exception' || e.type === 'console_error');
    if (runtimeErr.length > 15) findings.push(this.f('runtime_error_storm', 'low', 'stability', 'High runtime error frequency can hide security regressions', runtimeErr));

    return findings;
  }

  private f(id: string, severity: RuntimeSecurityFinding['severity'], category: string, title: string, ev: NormalizedEvent[]): RuntimeSecurityFinding {
    return { id, severity, category, title, evidence: ev.slice(0, 10).map((e) => e.id), confidence: Math.min(0.95, 0.5 + ev.length * 0.03) };
  }
}
