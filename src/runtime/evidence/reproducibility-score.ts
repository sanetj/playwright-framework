import { DeterminismCheckResult } from '../replay/replay-determinism';

export interface ReproducibilityMetrics {
  score: number; // 0.0 to 1.0
  timingVarianceMs: number;
  deterministicRunsCount: number;
  totalRunsCount: number;
  isStable: boolean;
}

export class ReproducibilityScorer {
  /**
   * Calculates how reproducible an evidence trace is across multiple replays.
   */
  public score(
    determinismChecks: DeterminismCheckResult[],
    timingDeltasMs: number[]
  ): ReproducibilityMetrics {
    if (determinismChecks.length === 0) {
      return { score: 0, timingVarianceMs: 0, deterministicRunsCount: 0, totalRunsCount: 0, isStable: false };
    }

    const deterministicRuns = determinismChecks.filter(d => d.isDeterministic).length;
    const totalRuns = determinismChecks.length;
    
    // Base score is simply the ratio of successful deterministic replays
    let score = deterministicRuns / totalRuns;

    // Calculate timing variance
    const avgTiming = timingDeltasMs.reduce((a, b) => a + b, 0) / (timingDeltasMs.length || 1);
    const maxVariance = Math.max(...timingDeltasMs.map(t => Math.abs(t - avgTiming)));
    
    // Penalize score slightly if timing variance is extreme (e.g. > 5 seconds variance)
    if (maxVariance > 5000) {
      score -= 0.1;
    }

    score = Math.max(0, Math.min(score, 1.0));

    return {
      score,
      timingVarianceMs: maxVariance,
      deterministicRunsCount: deterministicRuns,
      totalRunsCount: totalRuns,
      isStable: score >= 0.8
    };
  }
}
