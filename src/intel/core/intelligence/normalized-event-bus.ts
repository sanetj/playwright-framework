import {
  ActorContext,
  EventLifecycleStage,
  IntelEventType,
  NormalizedEvent as CanonicalEvent,
  RawRuntimeEvent,
  TelemetryTier,
} from '../../../intelligence/events/normalized-event';
import { NormalizedEventBus as CanonicalEventBus } from '../../../intelligence/events/normalized-event-bus';

export type NormalizedEventType = 'ui.action' | 'navigation' | 'network.request' | 'network.response' | 'dom.mutation' | 'runtime' | 'storage' | 'auth';

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
  tier?: TelemetryTier;
  chainId?: string;
  lifecycle?: readonly EventLifecycleStage[];
}

export interface EventTimeline {
  events: NormalizedEvent[];
  byType: Record<NormalizedEventType, NormalizedEvent[]>;
  causality: Map<string, string[]>;
}

export class NormalizedEventBus {
  private readonly canonical = new CanonicalEventBus();
  private readonly compatEvents: NormalizedEvent[] = [];

  public publish<T>(event: Omit<NormalizedEvent<T>, 'id' | 'ts' | 'causes'> & { ts?: number; causes?: string[] }): NormalizedEvent<T> {
    const ts = event.ts ?? Date.now();
    const raw: RawRuntimeEvent = {
      type: this.compatToRawType(event.type),
      ts,
      href: event.ctx.pageUrl ?? 'about:blank',
      payload: event.data as Record<string, unknown>,
      traceId: `compat_${ts}_${this.compatEvents.length + 1}`,
      causeTraceId: undefined,
    };
    const actor: ActorContext = {
      sessionId: event.ctx.sessionId ?? 'default',
      role: event.ctx.role ?? 'unknown',
      authState: event.ctx.authState ?? 'anonymous',
    };

    const canonical = this.canonical.ingest(raw, actor);
    const compat: NormalizedEvent<T> = {
      id: canonical?.id ?? `evt_${this.compatEvents.length + 1}`,
      ts,
      type: event.type,
      source: event.source,
      ctx: event.ctx,
      data: event.data,
      causes: event.causes ?? [],
      tier: canonical?.tier,
      chainId: canonical?.chainId,
      lifecycle: canonical?.lifecycle,
    };
    this.compatEvents.push(compat as NormalizedEvent);
    return compat;
  }

  public getTimeline(): EventTimeline {
    const byType: EventTimeline['byType'] = {
      'ui.action': [], navigation: [], 'network.request': [], 'network.response': [], 'dom.mutation': [], runtime: [], storage: [], auth: [],
    };
    const events = [...this.compatEvents].sort((a, b) => a.ts - b.ts);
    const causality = new Map<string, string[]>();
    for (const event of events) { byType[event.type].push(event); causality.set(event.id, [...event.causes]); }
    return { events, byType, causality };
  }

  public getCanonicalTimeline(): CanonicalEvent[] {
    return this.canonical.timeline();
  }

  private compatToRawType(type: NormalizedEventType): string {
    if (type === 'network.request') return 'fetch_request';
    if (type === 'network.response') return 'fetch_response';
    if (type === 'dom.mutation') return 'mutation';
    if (type === 'ui.action') return 'click';
    if (type === 'auth') return 'auth_change';
    if (type === 'storage') return 'storage_access';
    return type;
  }
}
