import { ExploitEvidence } from './exploit-verifier';
import { ReplayInstabilityDiagnostic } from './rv2-instability-diagnostics';

export interface HumanReadableEvidenceSummary {
  readonly summaryTitle: string;
  readonly verdict: 'VULNERABLE' | 'SECURE_OR_DENIED' | 'UNSTABLE_DIAGNOSTIC';
  readonly originalTargetUri: string;
  readonly targetRole: string;
  readonly mutationPlanId: string;
  readonly reproducibilityRate: string;
  readonly lineageTrace: string;
  readonly instabilityDiagnostics?: ReplayInstabilityDiagnostic;
  readonly actionableRejectionAdvice?: string;
}

export class HumanReadableEvidenceExporter {
  /**
   * Stably exports a human-readable evidence summary based on the exploit proof and diagnostic records.
   */
  public exportHumanSummary(
    evidence: ExploitEvidence,
    diagnostic: ReplayInstabilityDiagnostic
  ): HumanReadableEvidenceSummary {
    const isExploited = evidence.structuralVerificationOutcome.isExploited;
    const runsCount = evidence.evidenceCorrelation.reproducibilityRunCount;
    const stableRuns = evidence.evidenceCorrelation.consistencySignals.filter(s => !s.driftDetected).length;

    let verdict: 'VULNERABLE' | 'SECURE_OR_DENIED' | 'UNSTABLE_DIAGNOSTIC' = 'SECURE_OR_DENIED';
    if (diagnostic.hasInstability) {
      verdict = 'UNSTABLE_DIAGNOSTIC';
    } else if (isExploited) {
      verdict = 'VULNERABLE';
    }

    let actionableRejectionAdvice = '';
    if (evidence.rejectionSignal) {
      const category = evidence.rejectionSignal.category;
      if (category === 'CSRF_REJECTED') {
        actionableRejectionAdvice = 'Replay blocked by CSRF protection. Ensure anti-forgery tokens are refreshed or excluded from perturbation.';
      } else if (category === 'AUTH_EXPIRED') {
        actionableRejectionAdvice = 'Replay context authentication has expired. Re-authenticate session before proceeding.';
      } else if (category === 'ANTI_AUTOMATION_BLOCK') {
        actionableRejectionAdvice = 'Replay blocked by Cloudflare/WAF anti-bot screen. Dynamic bypass or CAPTCHA solving required.';
      } else if (category === 'REDIRECTED') {
        actionableRejectionAdvice = 'Dynamic login or target redirection detected. Verify authentication context remains active.';
      } else if (category === 'SESSION_INVALIDATED') {
        actionableRejectionAdvice = 'Session invalidation triggered. Clean cookie cache and request a fresh session token.';
      }
    }

    const summaryTitle = `Reality Validation Evidence Export: ${evidence.evidenceId}`;
    const originalTargetUri = evidence.originalExchange.request.url;
    const targetRole = evidence.roleSessionLineage.replayedRole;
    const mutationPlanId = evidence.mutationLineage.planId;
    const reproducibilityRate = `${stableRuns}/${runsCount} runs stable`;
    
    // Stable, deterministic representation of lineage trace
    const lineageTrace = `ORIG_ID: ${evidence.originalExchange.exchangeId.id} -> MUTATIONS: ${evidence.deterministicReplayMetadata.mutationFingerprint} -> TARGET: ${evidence.roleSessionLineage.replayedRole} -> VERDICT: ${verdict}`;

    const summary: HumanReadableEvidenceSummary = {
      summaryTitle,
      verdict,
      originalTargetUri,
      targetRole,
      mutationPlanId,
      reproducibilityRate,
      lineageTrace,
      instabilityDiagnostics: diagnostic,
      actionableRejectionAdvice: actionableRejectionAdvice || undefined
    };

    // Deep freeze the exported summary
    return this.deepFreeze(summary);
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
