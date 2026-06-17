import { IntelligenceTelemetry } from '../resource-analysis/intelligence-telemetry';

export interface DifferentialFinding {
  findingId?: string;
  type: 'IDOR_CANDIDATE' | 'PRIVILEGE_ESCALATION_CANDIDATE' | 'STATUS_CONTRADICTION' | 'TENANT_ESCAPE_CANDIDATE';
  targetEntityId?: string;
  targetRole: string;
  baseStatus?: number;
  comparisonStatus?: number;
  description: string;
  intelligenceTelemetry?: IntelligenceTelemetry;
}
