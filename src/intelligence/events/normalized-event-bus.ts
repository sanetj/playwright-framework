import { createHash } from 'node:crypto';
import { IntelEventType, NormalizedEvent, RawRuntimeEvent } from './normalized-event';

/**
 * @canonical
 * The definitive event bus for the Browser Runtime Intelligence Platform.
 */
export class NormalizedEventBus {
  private events: NormalizedEvent[] = [];
  private lastBySession = new Map<string, string>();

  public normalize(raw: RawRuntimeEvent, actor: NormalizedEvent['actor'], beforeState?: string, afterState?: string): NormalizedEvent {
    const path = this.safePath(raw.href);
    const parentEventId = this.lastBySession.get(actor.sessionId);
    const causes = parentEventId ? [parentEventId] : [];
    const type = this.mapType(raw.type);
    const id = this.hash(`${raw.ts}|${actor.sessionId}|${type}|${path}|${JSON.stringify(raw.payload)}`);

    const event: NormalizedEvent = {
      id,
      type,
      ts: raw.ts,
      tier: this.mapTier(type),
      actor,
      route: { url: raw.href, path },
      parentEventId,
      causes,
      beforeState,
      afterState,
      payload: raw.payload,
    };

    this.publish(event);
    return event;
  }

  public publish(event: NormalizedEvent): void {
    this.events.push(event);
    this.lastBySession.set(event.actor.sessionId, event.id);
  }

  public timeline(): NormalizedEvent[] {
    return [...this.events].sort((a, b) => a.ts - b.ts);
  }

  private mapType(type: string): IntelEventType {
    const t = type.toLowerCase();
    if (t.includes('fetch') || t.includes('xhr_request')) return 'api_request';
    if (t.includes('xhr_response') || t.includes('fetch_response')) return 'api_response';
    if (t.includes('click')) return 'click';
    if (t.includes('input')) return 'input';
    if (t.includes('mutation')) return 'mutation';
    if (t.includes('storage')) return 'storage_access';
    if (t.includes('websocket')) return 'websocket';
    if (t.includes('route')) return 'route_transition';
    if (t.includes('form_submit')) return 'form_submit';
    if (t.includes('file_upload')) return 'file_upload';
    if (t.includes('modal_open')) return 'modal_open';
    if (t.includes('modal_close')) return 'modal_close';
    if (t.includes('auth')) return 'auth_change';
    if (t.includes('console_error')) return 'console_error';
    if (t.includes('runtime_exception')) return 'runtime_exception';
    return 'navigation';
  }

  private mapTier(type: IntelEventType): NormalizedEvent['tier'] {
    switch (type) {
      case 'runtime_exception':
      case 'console_error': return 'CRITICAL';
      case 'form_submit':
      case 'file_upload':
      case 'auth_change': return 'WORKFLOW';
      case 'click':
      case 'input':
      case 'modal_open':
      case 'modal_close': return 'INTERACTION';
      case 'navigation':
      case 'route_transition': return 'STRUCTURAL';
      case 'api_request':
      case 'api_response':
      case 'websocket':
      case 'storage_access': return 'DIAGNOSTIC';
      default: return 'NOISE';
    }
  }

  private safePath(url: string): string {
    try { return new URL(url).pathname; } catch { return url; }
  }

  private hash(input: string): string {
    return createHash('sha1').update(input).digest('hex').slice(0, 16);
  }
}
