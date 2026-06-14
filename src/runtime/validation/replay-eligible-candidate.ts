import { DifferentialFinding } from '../../intelligence/differentials/differential-finding';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';
import { RuntimeRoleProfile, SessionIsolationBoundary } from '../../intelligence/runtime/multi-session-runtime';

export interface ReplayEligibleCandidate {
    finding: DifferentialFinding;
    baselineExchange: CanonicalHttpExchange;
    comparisonProfile: RuntimeRoleProfile;
    sessionIsolationBoundary: SessionIsolationBoundary;
}
