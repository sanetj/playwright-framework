/**
 * @canonical
 * Investigation Bundle Artifacts
 * Structured, human- and AI-readable evidence bundles representing the primary economic output of the platform.
 */

import { ReplayBehaviorDifferential } from '../differentials/role-differential';

export interface ScreenshotEvidence {
  evidenceId: string;
  screenshotPath: string;
  associatedEventId: string;
  highlightCoordinates?: { x: number; y: number; width: number; height: number };
}

export interface HttpEvidenceArtifact {
  evidenceId: string;
  requestPayloadSnapshot: string;
  responsePayloadSnapshot: string;
  statusCode: number;
  headersHash: string;
  associatedEventId: string;
}

export interface CausalEvidenceNarrative {
  narrativeId: string;
  markdownSummary: string;
  causalEventIdsInOrder: string[];
}

export interface ExploitabilitySummary {
  summaryId: string;
  mappedVulnerabilityType: string;
  impactDescription: string;
  prerequisites: string[];
  remediationHint?: string;
}

export interface ReplayTraceArtifact {
  traceId: string;
  sessionId: string;
  exportedTraceFilePath: string; // The .zip or raw playwright trace
}

export interface InvestigationConfidence {
  overallScore: number;
  isDeterministicallyReproduced: boolean;
  confidenceJustification: string;
}

export interface DifferentialRoleEvidence {
  differentialId: string;
  roleDifferentials: ReplayBehaviorDifferential[];
}

import { ExploitValidation } from '../investigation/exploit-validation';
import { AuthorizationContradiction } from '../investigation/auth-contradictions';
import { ReportNarrative } from './report-mapping';
import { GroupedContradictionSummary } from './ai-bundle-compressor';

export interface InvestigationBundle {
  bundleId: string;
  generatedAtTs: number;
  targetProfileId: string;
  title: string;
  exploitabilitySummary: ExploitabilitySummary;
  causalNarrative: CausalEvidenceNarrative;
  httpEvidence: HttpEvidenceArtifact[];
  screenshotEvidence: ScreenshotEvidence[];
  replayTraces: ReplayTraceArtifact[];
  differentialEvidence?: DifferentialRoleEvidence;
  confidence: InvestigationConfidence;
  
  // Phase 8.1 additions
  exploitValidation?: ExploitValidation;
  authorizationContradictions?: AuthorizationContradiction[];
  aiReadyReportNarrative?: ReportNarrative;
  groupedContradictionSummary?: GroupedContradictionSummary;
}
