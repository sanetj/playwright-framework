/**
 * @canonical
 * Adaptive Prioritization Engine Contracts
 * Determines 'what matters most' using explainable ranking signals tied strictly to evidence lineage.
 */

export interface PrioritySignal {
  signalId: string;
  weight: number;
  reasons: string[];
  evidenceLineageRefs: string[];
}

export interface ExploitabilitySignal extends PrioritySignal {
  type: 'EXPLOITABILITY';
  requiresAuthentication: boolean;
  knownPayloadTemplateExists: boolean;
}

export interface TrustImpactSignal extends PrioritySignal {
  type: 'TRUST_IMPACT';
  impactsCrossTenantBoundary: boolean;
  impactsPrivilegeEscalation: boolean;
}

export interface UncertaintySignal extends PrioritySignal {
  type: 'UNCERTAINTY';
  contradictionExists: boolean;
  hypothesisConfidence: number;
}

export interface BoundaryCriticality extends PrioritySignal {
  type: 'BOUNDARY_CRITICALITY';
  boundaryType: 'SESSION' | 'TENANT' | 'ROLE' | 'OWNERSHIP';
  isEnforcedByServer: boolean;
}

export interface GraphCentralityScore extends PrioritySignal {
  type: 'GRAPH_CENTRALITY';
  nodeInDegree: number;
  nodeOutDegree: number;
  isChokepoint: boolean;
}

export interface InvestigationPriority {
  targetId: string; // The ID of the Hypothesis, FrontierCandidate, or Contradiction
  aggregateScore: number;
  calculatedAtTs: number;
  contributingSignals: Array<
    | ExploitabilitySignal
    | TrustImpactSignal
    | UncertaintySignal
    | BoundaryCriticality
    | GraphCentralityScore
  >;
}
