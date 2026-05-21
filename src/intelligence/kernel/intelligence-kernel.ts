import { NormalizedEvent } from '../events/normalized-event';

export interface SemanticArtifact {
  kind: 'workflow' | 'graph' | 'trust' | 'semantic-api' | 'security-finding' | 'signal-summary';
  confidence: number;
  payload: Record<string, unknown>;
}

export interface KernelAnalyzer {
  name: string;
  order: number;
  consumesTiers?: string[];
  analyze(events: NormalizedEvent[]): Promise<SemanticArtifact[]>;
}

export interface KernelRunResult {
  artifacts: SemanticArtifact[];
  analyzerOrder: string[];
  overallConfidence: number;
}

/**
 * @canonical
 * The definitive orchestration authority for the Browser Runtime Intelligence Platform.
 * DO NOT create parallel orchestrators. All intelligence systems must register here.
 */
export class IntelligenceKernel {
  private analyzers: KernelAnalyzer[] = [];

  public register(analyzer: KernelAnalyzer): void {
    this.analyzers.push(analyzer);
    this.analyzers.sort((a, b) => a.order - b.order);
  }

  public async run(events: NormalizedEvent[]): Promise<KernelRunResult> {
    const artifacts: SemanticArtifact[] = [];
    const analyzerOrder: string[] = [];

    for (const analyzer of this.analyzers) {
      analyzerOrder.push(analyzer.name);
      const results = await analyzer.analyze(events);
      artifacts.push(...results);
    }

    const overallConfidence = artifacts.length
      ? Number((artifacts.reduce((sum, a) => sum + a.confidence, 0) / artifacts.length).toFixed(2))
      : 0;

    return { artifacts, analyzerOrder, overallConfidence };
  }
}
