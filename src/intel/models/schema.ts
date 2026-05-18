export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface RouteNode {
  id: string;
  url: string;
  title?: string;
  depth: number;
  sourceAction?: string;
  isProtected?: boolean;
  technologies?: string[];
}

export interface ApiEndpoint {
  id: string;
  url: string;
  method: HttpMethod;
  statusCodes: number[];
  contentTypes: string[];
  authObserved: string[];
  parameters: string[];
  sampleRequest?: Record<string, unknown>;
  sampleResponse?: Record<string, unknown>;
  riskTags: string[];
}

export interface AuthSignal {
  mechanism: 'cookie' | 'jwt' | 'oauth' | 'session' | 'csrf' | 'unknown';
  evidence: string;
  confidence: number;
}

export interface WorkflowStep {
  id: string;
  routeId: string;
  action: string;
  transitionTo?: string;
  requiresAuth?: boolean;
  dataMutating?: boolean;
}

export interface SecurityFinding {
  id: string;
  category: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  evidence: string[];
  recommendation: string;
  cwe?: string;
  confidence: number;
}

export interface AppContextDossier {
  target: string;
  generatedAt: string;
  architectureSummary: string;
  technologies: string[];
  routes: RouteNode[];
  endpoints: ApiEndpoint[];
  workflows: WorkflowStep[];
  authSignals: AuthSignal[];
  findings: SecurityFinding[];
  trustBoundaries: string[];
  nextAuditAreas: string[];
  score: {
    attackSurface: number;
    authComplexity: number;
    dataSensitivity: number;
    interestingness: number;
  };
}

export interface PluginContext {
  dossier: AppContextDossier;
  raw: Record<string, unknown>;
}

export interface IntelligencePlugin {
  name: string;
  version: string;
  description: string;
  run(ctx: PluginContext): Promise<SecurityFinding[]>;
}
