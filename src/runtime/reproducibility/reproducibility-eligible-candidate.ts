import { ValidatedFinding } from '../../runtime/validation/exploit-validation-engine';
import { ExploitProof } from '../evidence/exploit-proof-capture';
import { RuntimeRoleProfile, SessionIsolationBoundary } from '../../intelligence/runtime/multi-session-runtime';

export interface ReproducibilityEligibleCandidate {
  finding: ValidatedFinding;
  proof: ExploitProof;
  comparisonProfile: RuntimeRoleProfile;
  sessionIsolationBoundary: SessionIsolationBoundary;
}
