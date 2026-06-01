import { ExploitEvidence, ReplayConsistencySignal } from './exploit-verifier';

export interface ReplayInstabilityDiagnostic {
  readonly hasInstability: boolean;
  readonly categories: ReadonlyArray<'NORMALIZATION_INSTABILITY' | 'REDIRECT_INSTABILITY' | 'AUTH_CHURN' | 'COOKIE_INVALIDATION' | 'REPLAY_INCONSISTENCY'>;
  readonly details: string;
}

export class ReplayInstabilityDetector {
  /**
   * Diagnoses instability across multiple reproducibility runs and classification metrics.
   */
  public diagnose(
    signals: ReadonlyArray<ReplayConsistencySignal>,
    evidence: ExploitEvidence
  ): ReplayInstabilityDiagnostic {
    const categories: Array<'NORMALIZATION_INSTABILITY' | 'REDIRECT_INSTABILITY' | 'AUTH_CHURN' | 'COOKIE_INVALIDATION' | 'REPLAY_INCONSISTENCY'> = [];
    const detailsList: string[] = [];

    // 1. Detect NORMALIZATION_INSTABILITY
    const bodyStructureMismatches = signals.filter(s => !s.bodyStructureMatch).length;
    if (bodyStructureMismatches > 0) {
      categories.push('NORMALIZATION_INSTABILITY');
      detailsList.push(`Body structure/schema mismatched in ${bodyStructureMismatches} out of ${signals.length} reproducibility runs.`);
    }

    // 2. Detect REDIRECT_INSTABILITY
    const replayedHeaders = evidence.replayedExchange.response?.headers || [];
    const locationHeader = replayedHeaders.find(h => h.name.toLowerCase() === 'location')?.value;
    const origHeaders = evidence.originalExchange.response?.headers || [];
    const origLocation = origHeaders.find(h => h.name.toLowerCase() === 'location')?.value;

    if (evidence.rejectionSignal?.category === 'REDIRECTED' && locationHeader && origLocation) {
      if (locationHeader !== origLocation) {
        categories.push('REDIRECT_INSTABILITY');
        detailsList.push(`Redirect location mismatch detected. Original redirect location '${origLocation}' drifted to '${locationHeader}'.`);
      }
    }

    // 3. Detect AUTH_CHURN
    const reqHeaders = evidence.replayedExchange.request.headers;
    const authHeaders = reqHeaders.filter(h => h.name.toLowerCase() === 'authorization');
    if (authHeaders.length > 1) {
      categories.push('AUTH_CHURN');
      detailsList.push(`Multiple authorization headers detected in replayed request, indicating active auth token churn.`);
    }

    // 4. Detect COOKIE_INVALIDATION
    if (
      evidence.rejectionSignal?.category === 'AUTH_EXPIRED' ||
      evidence.rejectionSignal?.category === 'SESSION_INVALIDATED'
    ) {
      categories.push('COOKIE_INVALIDATION');
      detailsList.push(`Session cookie invalidated during replay: status ${evidence.replayedExchange.response?.status || 0} categorized as '${evidence.rejectionSignal.category}'.`);
    }

    // 5. Detect REPLAY_INCONSISTENCY
    const statusMismatches = signals.filter(s => !s.statusMatch).length;
    const driftedRuns = signals.filter(s => s.driftDetected).length;
    if (statusMismatches > 0 || driftedRuns > 0) {
      categories.push('REPLAY_INCONSISTENCY');
      detailsList.push(`Inconsistent replay runs detected. Status code mismatched in ${statusMismatches} runs; general drift detected in ${driftedRuns} runs.`);
    }

    // Sort details lexicographically to guarantee 100% deterministic output ordering
    detailsList.sort();

    const diagnostic: ReplayInstabilityDiagnostic = {
      hasInstability: categories.length > 0,
      categories: Object.freeze(categories),
      details: detailsList.join(' ')
    };

    return Object.freeze(diagnostic);
  }
}
