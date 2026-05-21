import { NormalizedEvent, TelemetryTier } from '../events/normalized-event';

export interface SignalGovernancePolicy {
  minTier?: TelemetryTier;
  suppressDuplicates?: boolean;
  entropyWindowSize?: number;
  maxEventsPerChain?: number;
}

export interface GovernedSignal {
  event: NormalizedEvent;
  relevance: number;
  entropy: number;
  kept: boolean;
  reason: string;
}

const tierRank: Record<TelemetryTier, number> = {
  CRITICAL: 6,
  WORKFLOW: 5,
  INTERACTION: 4,
  STRUCTURAL: 3,
  DIAGNOSTIC: 2,
  NOISE: 1,
};

export class SignalGovernance {
  public apply(events: NormalizedEvent[], policy: SignalGovernancePolicy = {}): GovernedSignal[] {
    const minRank = tierRank[policy.minTier ?? 'NOISE'];
    const fingerprintSeen = new Set<string>();
    const chainCounts = new Map<string, number>();

    return events.map((event) => {
      const fp = `${event.type}|${event.route.path}|${JSON.stringify(event.payload)}`;
      const entropy = this.entropy(JSON.stringify(event.payload));
      const relevance = Number(((tierRank[event.tier] / 6) * 0.7 + Math.min(entropy / 4, 1) * 0.3).toFixed(3));

      const chainId = event.chainId ?? 'unknown';
      const chainCount = (chainCounts.get(chainId) ?? 0) + 1;
      chainCounts.set(chainId, chainCount);

      if (tierRank[event.tier] < minRank) {
        return { event, relevance, entropy, kept: false, reason: 'below-min-tier' };
      }
      if (policy.suppressDuplicates && fingerprintSeen.has(fp)) {
        return { event, relevance, entropy, kept: false, reason: 'duplicate-fingerprint' };
      }
      if (policy.maxEventsPerChain && chainCount > policy.maxEventsPerChain) {
        return { event, relevance, entropy, kept: false, reason: 'chain-budget-exceeded' };
      }

      fingerprintSeen.add(fp);
      return { event, relevance, entropy, kept: true, reason: 'accepted' };
    });
  }

  private entropy(value: string): number {
    if (!value) return 0;
    const freq = new Map<string, number>();
    for (const ch of value) freq.set(ch, (freq.get(ch) ?? 0) + 1);
    const len = value.length;
    let h = 0;
    for (const n of freq.values()) {
      const p = n / len;
      h -= p * Math.log2(p);
    }
    return Number(h.toFixed(3));
  }
}
