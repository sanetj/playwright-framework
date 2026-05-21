/**
 * @canonical
 * Evidence-to-Report Mapping Contracts
 * Maps replay evidence directly into repro steps, impact statements, and AI-ready structures.
 */

import { ReplayTraceArtifact, ScreenshotEvidence, HttpEvidenceArtifact } from './investigation-bundle';

export interface EvidenceReference {
  referenceId: string;
  referencedReplayTrace?: ReplayTraceArtifact;
  referencedScreenshot?: ScreenshotEvidence;
  referencedHttp?: HttpEvidenceArtifact;
  inlineDescription: string;
}

export interface ReproductionSequence {
  sequenceId: string;
  stepNumber: number;
  actionDescription: string; // e.g., 'Log in as User A and capture the session cookie.'
  supportingEvidence?: EvidenceReference;
}

export interface ImpactNarrative {
  narrativeId: string;
  businessImpactDescription: string;
  technicalImpactDescription: string;
  severityScore: number;
}

export interface VulnerabilityAssertion {
  assertionId: string;
  vulnerabilityType: string;
  affectedEndpoint: string;
  parameterAtFault?: string;
  assertionConfidence: number;
}

export interface ReportSectionMapping {
  sectionId: string;
  sectionHeader: string;
  markdownContent: string;
  embeddedEvidenceRefs: string[];
}

export interface ReportNarrative {
  narrativeId: string;
  sourceBundleId: string;
  vulnerabilityAssertion: VulnerabilityAssertion;
  impact: ImpactNarrative;
  reproductionSteps: ReproductionSequence[];
  sections: ReportSectionMapping[];
  generatedAtTs: number;
}
