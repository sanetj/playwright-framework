export type IntelEventType =
  | 'navigation' | 'click' | 'input' | 'mutation' | 'api_request' | 'api_response' | 'websocket' | 'sse'
  | 'storage_access' | 'auth_change' | 'modal_open' | 'modal_close' | 'route_transition' | 'form_submit'
  | 'file_upload' | 'console_error' | 'runtime_exception' | 'csp_violation' | 'cookie_mutation' | 'indexeddb_access';

export type TelemetryTier = 'CRITICAL' | 'WORKFLOW' | 'STRUCTURAL' | 'DEBUG' | 'NOISE';
export type EventLifecycleStage = 'captured' | 'normalized' | 'deduplicated' | 'grouped' | 'replay_ready';

export interface ActorContext {
  sessionId: string;
  role: string;
  userId?: string;
  authState: 'anonymous' | 'authenticated' | 'elevated';
}
export interface RouteContext { url: string; path: string; title?: string; referrer?: string; }

export interface NormalizedEvent<T = Record<string, unknown>> {
  id: string;
  type: IntelEventType;
  tier: TelemetryTier;
  ts: number;
  seq: number;
  parentEventId?: string;
  chainId: string;
  route: RouteContext;
  actor: ActorContext;
  causes: string[];
  beforeState?: string;
  afterState?: string;
  lifecycle: EventLifecycleStage[];
  payload: T;
}

export interface RawRuntimeEvent {
  type: string;
  ts: number;
  href: string;
  payload: Record<string, unknown>;
  traceId: string;
  causeTraceId?: string;
}
