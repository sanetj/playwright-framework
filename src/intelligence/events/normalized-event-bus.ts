import { createHash } from 'node:crypto';
import { ActorContext, IntelEventType, NormalizedEvent, RawRuntimeEvent, TelemetryRoutingPolicy, TelemetryTier } from './normalized-event';

export class NormalizedEventBus {
  private events: NormalizedEvent[] = [];
  private traceToEvent = new Map<string, string>();
  private lastEventBySession = new Map<string, string>();
  private lastTsBySession = new Map<string, number>();
  private seenFingerprints = new Set<string>();
  private sequence = 0;
  private readonly subscribers = new Set<(event: NormalizedEvent) => void>();
  private policy: TelemetryRoutingPolicy = {};
  private secondWindow = 0;
  private secondCount = 0;

  public setRoutingPolicy(policy: TelemetryRoutingPolicy): void { this.policy = policy; }
  public subscribe(listener: (event: NormalizedEvent) => void): () => void {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  public ingest(raw: RawRuntimeEvent, actor: ActorContext, states?: { before?: string; after?: string }): NormalizedEvent | undefined {
    const path = this.path(raw.href);
    const type = this.mapType(raw.type);
    const tier = this.classifyTier(type);
    if (!this.allowed(type, tier, raw.ts)) return undefined;

    const ts = this.monotonicTs(actor.sessionId, raw.ts);
    const parentEventId = raw.causeTraceId ? this.traceToEvent.get(raw.causeTraceId) : this.lastEventBySession.get(actor.sessionId);
    const chainId = parentEventId ?? this.hash(`${actor.sessionId}:${Math.floor(ts / 1000)}`);
    const id = this.hash(`${raw.traceId}|${ts}|${type}|${path}|${actor.sessionId}`);
    const fingerprint = this.hash(`${type}|${path}|${JSON.stringify(raw.payload)}|${parentEventId ?? ''}`);

    if (this.seenFingerprints.has(fingerprint)) return undefined;
    this.seenFingerprints.add(fingerprint);

    const event: NormalizedEvent = Object.freeze({
      id, type, tier, ts, seq: ++this.sequence, parentEventId, chainId,
      route: Object.freeze({ url: raw.href, path }), actor: Object.freeze({ ...actor }),
      causes: Object.freeze(parentEventId ? [parentEventId] : []),
      beforeState: states?.before, afterState: states?.after,
      lifecycle: Object.freeze(['captured', 'normalized', 'deduplicated'] as const),
      payload: Object.freeze(raw.payload),
    });

    this.events.push(event);
    this.traceToEvent.set(raw.traceId, id);
    this.lastEventBySession.set(actor.sessionId, id);
    for (const sub of this.subscribers) sub(event);
    return event;
  }

  public timeline(): NormalizedEvent[] { return [...this.events].sort((a, b) => (a.ts - b.ts) || (a.seq - b.seq)); }

  public markReplayReady(chainId: string): void {
    this.events = this.events.map((e) => {
      if (e.chainId !== chainId || e.lifecycle.includes('replay_ready')) return e;
      return Object.freeze({ ...e, lifecycle: Object.freeze([...e.lifecycle, 'grouped', 'replay_ready'] as const) });
    });
  }

  private allowed(type: IntelEventType, tier: TelemetryTier, ts: number): boolean {
    if (this.policy.includeTiers && !this.policy.includeTiers.includes(tier)) return false;
    if (this.policy.excludeEventTypes?.includes(type)) return false;
    const sec = Math.floor(ts / 1000);
    if (sec !== this.secondWindow) { this.secondWindow = sec; this.secondCount = 0; }
    this.secondCount += 1;
    if (this.policy.maxEventsPerSecond && this.secondCount > this.policy.maxEventsPerSecond) return false;
    return true;
  }

  private mapType(type: string): IntelEventType {
    const t = type.toLowerCase();
    if (t.includes('fetch_request') || t.includes('xhr_request')) return 'api_request';
    if (t.includes('fetch_response') || t.includes('xhr_response')) return 'api_response';
    if (t.includes('websocket')) return 'websocket';
    if (t.includes('eventsource') || t.includes('sse')) return 'sse';
    if (t.includes('click')) return 'click'; if (t.includes('input')) return 'input'; if (t.includes('mutation')) return 'mutation';
    if (t.includes('route')) return 'route_transition'; if (t.includes('submit')) return 'form_submit'; if (t.includes('upload')) return 'file_upload';
    if (t.includes('storage')) return 'storage_access'; if (t.includes('cookie')) return 'cookie_mutation'; if (t.includes('indexeddb')) return 'indexeddb_access';
    if (t.includes('auth')) return 'auth_change'; if (t.includes('modal_open')) return 'modal_open'; if (t.includes('modal_close')) return 'modal_close';
    if (t.includes('console_error')) return 'console_error'; if (t.includes('csp')) return 'csp_violation'; if (t.includes('runtime_exception')) return 'runtime_exception';
    return 'navigation';
  }

  private classifyTier(type: IntelEventType): TelemetryTier {
    if (['runtime_exception', 'console_error', 'csp_violation', 'auth_change'].includes(type)) return 'CRITICAL';
    if (['click', 'input', 'form_submit', 'file_upload'].includes(type)) return 'INTERACTION';
    if (['route_transition', 'modal_open', 'modal_close'].includes(type)) return 'WORKFLOW';
    if (['navigation', 'api_request', 'api_response', 'websocket', 'sse'].includes(type)) return 'STRUCTURAL';
    if (['mutation', 'storage_access', 'cookie_mutation', 'indexeddb_access'].includes(type)) return 'DIAGNOSTIC';
    return 'NOISE';
  }

  private monotonicTs(sessionId: string, incoming: number): number {
    const prev = this.lastTsBySession.get(sessionId) ?? 0;
    const ts = incoming > prev ? incoming : prev + 1;
    this.lastTsBySession.set(sessionId, ts);
    return ts;
  }

  private hash(input: string): string { return createHash('sha1').update(input).digest('hex').slice(0, 18); }
  private path(url: string): string { try { return new URL(url).pathname; } catch { return url; } }
}
