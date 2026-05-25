/**
 * @canonical
 * Causal Cognition Graph Contracts
 * Models cognitive causality (why we believe what we believe), distinctly separate from the ActionGraph (what happened).
 */

import { EpistemicState } from '../epistemics/epistemic-state';
import { EpistemicInfluenceEdge } from '../epistemics/epistemic-influence';

export interface CausalCognitionNode {
  nodeId: string;
  nodeType: 'HYPOTHESIS' | 'CONTRADICTION' | 'TRUST_ASSERTION';
  referenceId: string; // ID of the specific candidate/contradiction/trust object
  epistemicState: EpistemicState;
}

export interface DependencyRelation {
  dependencyId: string;
  dependentNodeId: string;
  supportingNodeId: string;
  isRequiredForValidity: boolean;
}

export interface CausalInfluenceChain {
  chainId: string;
  orderedEdges: EpistemicInfluenceEdge[];
  terminalNodeId: string;
}

export interface CausalAnalysisPath {
  pathId: string;
  targetNodeId: string;
  supportingChains: CausalInfluenceChain[];
}

export interface EvidenceCollapse {
  collapseId: string;
  collapsedNodeId: string;
  triggeringDependencyId: string;
  collapsedAtTs: number;
}

export interface TrustDecayPropagation {
  propagationId: string;
  originContradictionNodeId: string;
  affectedTrustNodeIds: string[];
  decayFactorApplied: number;
}

export interface InvestigationCandidateEvolutionTrace {
  traceId: string;
  candidateNodeId: string;
  stateTransitions: Array<{ fromState: EpistemicState; toState: EpistemicState; ts: number }>;
  corroboratingEvidenceAdded: string[];
}
