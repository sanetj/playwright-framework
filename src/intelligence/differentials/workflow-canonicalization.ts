/**
 * @canonical
 * Workflow Canonicalization Contracts
 * Normalizes semantically equivalent workflows before differential comparison to prevent false positives.
 */

export interface ReplaySemanticAnchor {
  anchorId: string;
  originalEventId: string;
  semanticType: 'ENTITY_CREATION' | 'AUTH_STATE_CHANGE' | 'DATA_MUTATION' | 'NAVIGATION';
}

export interface WorkflowFingerprint {
  fingerprintHash: string;
  structuralElementSequence: string[]; // E.g., ['CLICK:button#login', 'NAVIGATE:/dashboard']
}

export interface WorkflowNormalizationRule {
  ruleId: string;
  targetParameterRegex: string; // e.g., ^user_[a-z0-9]+$
  normalizationStrategy: 'MASK_ID' | 'IGNORE_TIMESTAMP' | 'STANDARDIZE_UUID';
}

export interface WorkflowSemanticSignature {
  signatureId: string;
  fingerprint: WorkflowFingerprint;
  semanticAnchors: ReplaySemanticAnchor[];
  appliedNormalizationRules: string[];
}

export interface EquivalentWorkflowCluster {
  clusterId: string;
  semanticSignature: WorkflowSemanticSignature;
  memberSessionIds: string[]; // Sessions that exhibit this equivalent workflow
}

export interface CanonicalWorkflow {
  canonicalId: string;
  baseSignature: WorkflowSemanticSignature;
  clusters: EquivalentWorkflowCluster[];
}
