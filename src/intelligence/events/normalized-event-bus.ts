import { createHash } from 'node:crypto';
import { ActorContext, IntelEventType, NormalizedEvent, RawRuntimeEvent } from './normalized-event';

export class NormalizedEventBus {
  private events: NormalizedEvent[] = [];
  private traceToEvent = new Map<string, string>();
  private lastEventBySession = new Map<string, string>();

  public ingest(raw: RawRuntimeEvent, actor: ActorContext, states?: { before?: string; after?: string }): NormalizedEvent {
    const path = this.path(raw.href);
    const type = this.mapType(raw.type);
    const parentEventId = raw.causeTraceId ? this.traceToEvent.get(raw.causeTraceId) : this.lastEventBySession.get(actor.sessionId);
    const chainId = parentEventId ?? this.hash(`${actor.sessionId}:${Math.floor(raw.ts / 1000)}`);
    const id = this.hash(`${raw.traceId}|${raw.ts}|${type}|${path}|${actor.sessionId}`);

    const event: NormalizedEvent = {
      id, type, ts: raw.ts, parentEventId, chainId,
      route: { url: raw.href, path }, actor,
      causes: parentEventId ? [parentEventId] : [],
      beforeState: states?.before, afterState: states?.after,
      payload: raw.payload,
    };
    this.events.push(event);
    this.traceToEvent.set(raw.traceId, id);
    this.lastEventBySession.set(actor.sessionId, id);
    return event;
  }

  public timeline(): NormalizedEvent[] { return [...this.events].sort((a, b) => a.ts - b.ts); }

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
  private hash(input: string): string { return createHash('sha1').update(input).digest('hex').slice(0, 18); }
  private path(url: string): string { try { return new URL(url).pathname; } catch { return url; } }
}
