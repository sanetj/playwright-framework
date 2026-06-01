import { ExploitEvidence } from './exploit-verifier';
import { ReplayInstabilityDiagnostic } from './rv2-instability-diagnostics';

export interface WorkflowDivergenceSignal {
  readonly stepId: string;
  readonly description: string;
  readonly severity: 'HIGH' | 'MEDIUM' | 'INFO';
}

export interface DifferentialInvestigationSummary {
  readonly originalTargetUri: string;
  readonly originalRole: string;
  readonly replayedRole: string;
  readonly isPrivilegeBoundaryViolated: boolean;
  readonly crossTenantDataLeaked: boolean;
  readonly boundaryDivergenceDetails: string;
  readonly workflowDivergenceSignals: ReadonlyArray<WorkflowDivergenceSignal>;
}

export interface InvestigationBundle {
  readonly bundleId: string;
  readonly originalExchangeId: string;
  readonly mutationPlanId: string;
  readonly targetRoleProfileId: string;
  readonly evidenceId: string;
  readonly reproducibilityStatus: string;
  readonly rejectionClassification?: string;
  readonly instabilityDiagnostics: ReplayInstabilityDiagnostic;
  readonly differentialSummary: DifferentialInvestigationSummary;
  readonly serializedTraceFootprint: string;
}

export class InvestigationBundleExporter {
  /**
   * Generates a comprehensive, reviewer-trustworthy investigation bundle.
   */
  public generateBundle(
    evidence: ExploitEvidence,
    diagnostic: ReplayInstabilityDiagnostic
  ): InvestigationBundle {
    const originalStatus = evidence.statusCodeComparison.originalStatus;
    const replayedStatus = evidence.statusCodeComparison.replayedStatus;
    const isExploited = evidence.structuralVerificationOutcome.isExploited;

    const originalRole = evidence.roleSessionLineage.originalRole;
    const replayedRole = evidence.roleSessionLineage.replayedRole;

    const divergenceSignals: WorkflowDivergenceSignal[] = [];

    let isPrivilegeBoundaryViolated = false;
    let crossTenantDataLeaked = false;
    let boundaryDivergenceDetails = 'No critical authorization divergence detected.';

    // 1. Surfacing privilege boundary collapse (status transition 403 -> 200)
    if (originalStatus >= 400 && replayedStatus === 200) {
      isPrivilegeBoundaryViolated = true;
      boundaryDivergenceDetails = `Privilege boundary collapse detected. Route returned status code ${replayedStatus} (previously blocked with ${originalStatus}).`;
      divergenceSignals.push({
        stepId: 'privilege_boundary_collapse',
        description: `Authorization boundary divergence detected: step transitioned from blocked status ${originalStatus} to success status ${replayedStatus}.`,
        severity: 'HIGH'
      });
    }

    // 2. Surfacing cross-tenant data leak anomalies
    if (originalStatus === 200 && replayedStatus === 200 && originalRole !== replayedRole) {
      const isStructurallyEquivalent = evidence.structuralVerificationOutcome.bodyStructureMatch;
      if (isStructurallyEquivalent) {
        crossTenantDataLeaked = true;
        boundaryDivergenceDetails = `Cross-tenant data exposure: Role '${replayedRole}' successfully replayed structured data from Tenant/Role '${originalRole}'.`;
        divergenceSignals.push({
          stepId: 'cross_tenant_data_leak',
          description: `Tenant ${originalRole} replay exposed structurally equivalent data under Tenant ${replayedRole}.`,
          severity: 'HIGH'
        });
      }
    }

    // 3. Hidden workflow exposure surfacing (e.g. administrative routes matched)
    const lowerUrl = evidence.originalExchange.request.url.toLowerCase();
    if (isExploited && (lowerUrl.includes('admin') || lowerUrl.includes('manager') || lowerUrl.includes('dashboard'))) {
      divergenceSignals.push({
        stepId: 'hidden_admin_workflow_exposure',
        description: `Role ${replayedRole} exposed hidden administrative workflow step: reached restricted endpoint '${evidence.originalExchange.request.url}'.`,
        severity: 'HIGH'
      });
    }

    // 4. Stable reproducibility rate status string
    const runsCount = evidence.evidenceCorrelation.reproducibilityRunCount;
    const stableRuns = evidence.evidenceCorrelation.consistencySignals.filter(s => !s.driftDetected).length;
    const reproducibilityStatus = `${stableRuns}/${runsCount} runs stable`;

    // Sort signals lexicographically by stepId to ensure 100% deterministic output ordering
    divergenceSignals.sort((a, b) => a.stepId.localeCompare(b.stepId));

    const differentialSummary: DifferentialInvestigationSummary = {
      originalTargetUri: evidence.originalExchange.request.url,
      originalRole,
      replayedRole,
      isPrivilegeBoundaryViolated,
      crossTenantDataLeaked,
      boundaryDivergenceDetails,
      workflowDivergenceSignals: Object.freeze(divergenceSignals)
    };

    const bundleId = `bundle_${evidence.evidenceId}`;
    const originalExchangeId = evidence.originalExchange.exchangeId.id;
    const mutationPlanId = evidence.mutationLineage.planId;
    const targetRoleProfileId = replayedRole;
    const evidenceId = evidence.evidenceId;
    const rejectionClassification = evidence.rejectionSignal?.category;

    // Stable, sorted serialization trace footprint of headers and status code deltas
    const traceHeaders = (evidence.replayedExchange.response?.headers || []).map(h => `${h.name}:${h.value}`).sort().join('|');
    const serializedTraceFootprint = `BUNDLE_ID: ${bundleId} | ORIGINAL_STATUS: ${originalStatus} | REPLAYED_STATUS: ${replayedStatus} | HEADERS: ${traceHeaders}`;

    const bundle: InvestigationBundle = {
      bundleId,
      originalExchangeId,
      mutationPlanId,
      targetRoleProfileId,
      evidenceId,
      reproducibilityStatus,
      rejectionClassification,
      instabilityDiagnostics: diagnostic,
      differentialSummary,
      serializedTraceFootprint
    };

    // Deep freeze the bundle
    return this.deepFreeze(bundle);
  }

  private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    const rec = obj as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(obj)) {
      const prop = rec[key];
      if (prop !== null && typeof prop === 'object') {
        this.deepFreeze(prop);
      }
    }
    return Object.freeze(obj);
  }
}
