/**
 * @canonical
 * Authorization Contradiction Contracts
 * Specialized contradiction layer for identifying high-priority access control failures.
 */

import { ContradictionExploitMap } from './contradiction-investigator';

export interface AccessControlMismatch {
  mismatchId: string;
  expectedRole: string;
  observedSuccessfulRole: string;
  targetEndpoint: string;
}

export interface WorkflowAuthorizationGap {
  gapId: string;
  workflowId: string;
  unauthorizedSessionId: string;
  bypassedEventIds: string[];
}

export interface HiddenCapabilityExposure {
  exposureId: string;
  hiddenSelector: string; // E.g., 'button#admin-delete'
  roleName: string; // The non-admin role that found it
}

export interface DifferentialReplayContradiction {
  contradictionId: string;
  baseReplayOutcome: string;
  comparisonReplayOutcome: string;
  isContradictoryToPolicy: boolean;
}

export interface AuthorizationContradiction {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  mismatch?: AccessControlMismatch;
  workflowGap?: WorkflowAuthorizationGap;
  hiddenCapability?: HiddenCapabilityExposure;
  differentialReplay?: DifferentialReplayContradiction;
  mappedExploits?: ContradictionExploitMap;
}
