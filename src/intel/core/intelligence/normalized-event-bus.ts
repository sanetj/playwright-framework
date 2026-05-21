export type NormalizedEventType =
  | 'ui.action'
  | 'navigation'
  | 'network.request'
  | 'network.response'
  | 'dom.mutation'
  | 'runtime'
  | 'storage'
  | 'auth';

export interface EventContext {
  pageUrl?: string;
  frameUrl?: string;
  actionId?: string;
  requestId?: string;
  sessionId?: string;
  role?: string;
  authState?: 'anonymous' | 'authenticated' | 'elevated';
}

export interface NormalizedEvent<T = Record<string, unknown>> {
  id: string;
  ts: number;
  type: NormalizedEventType;
  source: 'playwright' | 'runtime' | 'network' | 'inference';
  ctx: EventContext;
  data: T;
  causes: string[];
}

export interface EventTimeline {
  events: NormalizedEvent[];
  byType: Record<NormalizedEventType, NormalizedEvent[]>;
  causality: Map<string, string[]>;
}

/**
 * @deprecated Legacy Subsystem
 * @see src/intelligence/events/normalized-event-bus.ts for the canonical event bus.
 * This class remains for backward compatibility. New systems MUST NOT use this bus.
 */
export class NormalizedEventBus {
  private events: NormalizedEvent[] = [];
  private lastEventByScope = new Map<string, string>();

  public publish<T>(event: Omit<NormalizedEvent<T>, 'id' | 'ts' | 'causes'> & { ts?: number; causes?: string[] }): NormalizedEvent<T> {
    const id = `evt_${this.events.length + 1}`;
    const ts = event.ts ?? Date.now();
    const scope = this.getScope(event.ctx);
    const inferredCause = this.lastEventByScope.get(scope);
    const normalized: NormalizedEvent<T> = {
      ...event,
      id,
      ts,
      causes: event.causes ?? (inferredCause ? [inferredCause] : []),
    };
    this.events.push(normalized as NormalizedEvent);
    this.lastEventByScope.set(scope, id);
    return normalized;
  }

  public getTimeline(): EventTimeline {
    const byType: EventTimeline['byType'] = {
      'ui.action': [],
      navigation: [],
      'network.request': [],
      'network.response': [],
      'dom.mutation': [],
      runtime: [],
      storage: [],
      auth: [],
    };

    const causality = new Map<string, string[]>();
    for (const event of this.events) {
      byType[event.type].push(event);
      causality.set(event.id, [...event.causes]);
    }

    return {
      events: [...this.events].sort((a, b) => a.ts - b.ts),
      byType,
      causality,
    };
  }

  private getScope(ctx: EventContext): string {
    return [ctx.sessionId ?? 'default', ctx.pageUrl ?? '-', ctx.role ?? '-'].join('::');
  }
}
