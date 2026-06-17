import { DifferentialFinding } from '../../intelligence/differentials/differential-finding';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';
import { RuntimeRoleProfile, SessionIsolationBoundary } from '../../intelligence/runtime/multi-session-runtime';
import { IntelligenceTelemetry } from '../../intelligence/resource-analysis/intelligence-telemetry';

export interface ReplayEligibleCandidate {
    finding: DifferentialFinding;
    baselineExchange: CanonicalHttpExchange;
    comparisonProfile: RuntimeRoleProfile;
    sessionIsolationBoundary: SessionIsolationBoundary;
    intelligenceTelemetry?: IntelligenceTelemetry;
}
