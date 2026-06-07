import { DifferentialFinding } from '../../intelligence/differentials/concrete-differential-engine';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';
import { RuntimeRoleProfile, SessionIsolationBoundary } from '../../intelligence/runtime/multi-session-runtime';

export interface ReplayEligibleCandidate {
    finding: DifferentialFinding;
    baselineExchange: CanonicalHttpExchange;
    comparisonProfile: RuntimeRoleProfile;
    sessionIsolationBoundary: SessionIsolationBoundary;
}
