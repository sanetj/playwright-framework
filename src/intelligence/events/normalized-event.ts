export type IntelEventType =
  | 'navigation'
  | 'click'
  | 'input'
  | 'mutation'
  | 'api_request'
  | 'api_response'
  | 'websocket'
  | 'storage_access'
  | 'auth_change'
  | 'modal_open'
  | 'modal_close'
  | 'route_transition'
  | 'form_submit'
  | 'file_upload'
  | 'console_error'
  | 'runtime_exception';

export interface ActorContext {
  sessionId: string;
  userId?: string;
  role: string;
  authState: 'anonymous' | 'authenticated' | 'elevated';
}

export interface RouteContext {
  url: string;
  path: string;
  title?: string;
}

export interface NormalizedEvent<T = Record<string, unknown>> {
  id: string;
  type: IntelEventType;
  ts: number;
  actor: ActorContext;
  route: RouteContext;
  parentEventId?: string;
  causes: string[];
  beforeState?: string;
  afterState?: string;
  payload: T;
}

export interface RawRuntimeEvent {
  type: string;
  ts: number;
  href: string;
  payload: Record<string, unknown>;
  traceId?: string;
}
