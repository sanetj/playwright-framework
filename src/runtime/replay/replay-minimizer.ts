import { EvidenceLineageChain } from '../evidence/evidence-lineage-chain';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';

export interface MinimalReplayRecipe {
  minimalExchanges: CanonicalHttpExchange[];
  removedCount: number;
}

export class ReplayMinimizer {
  /**
   * Analyzes the given lineage and exchanges to strip out noise (telemetry, analytics, 
   * static assets, duplicates) leaving only the essential state-building requests 
   * and the final mutated payload.
   */
  public minimize(lineage: EvidenceLineageChain, exchanges: CanonicalHttpExchange[]): MinimalReplayRecipe {
    if (!lineage || lineage.sourceExchangeIds.length === 0) {
      return { minimalExchanges: exchanges, removedCount: 0 };
    }

    const initialCount = exchanges.length;
    let minimalExchanges = [...exchanges];

    // 1. Remove obvious noise based on URL patterns
    const noisePatterns = [
      /google-analytics\.com/i,
      /datadoghq\.com/i,
      /sentry\.io/i,
      /\.js$/i,
      /\.css$/i,
      /\.png$/i,
      /\.jpg$/i,
      /\.svg$/i,
      /\.woff2?$/i,
      /telemetry/i,
      /metrics/i
    ];

    minimalExchanges = minimalExchanges.filter(ex => {
      const isNoise = noisePatterns.some(pattern => pattern.test(ex.request.url));
      // Always keep the source exchange that caused the finding
      const isSource = lineage.sourceExchangeIds.includes(ex.exchangeId);
      return isSource || !isNoise;
    });

    // 2. Remove duplicate identical GET requests (e.g., polling)
    const uniqueGets = new Set<string>();
    minimalExchanges = minimalExchanges.filter(ex => {
      if (ex.request.method === 'GET') {
        const key = `${ex.request.method}_${ex.request.url}`;
        if (uniqueGets.has(key) && !lineage.sourceExchangeIds.includes(ex.exchangeId)) {
          return false; // drop duplicate
        }
        uniqueGets.add(key);
      }
      return true;
    });

    // 3. (Future) Dependency graph reduction based on cookies/tokens

    return {
      minimalExchanges,
      removedCount: initialCount - minimalExchanges.length
    };
  }
}
