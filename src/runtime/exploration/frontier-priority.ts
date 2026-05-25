import { ExplorationCandidate, ExplorationMemory, ExplorationStrategy } from './exploration-strategy';

export interface FrontierItem extends ExplorationCandidate { depth: number; mutationSignals: number; }

export class FrontierPriority {
  constructor(private readonly strategy = new ExplorationStrategy()) {}

  rank(frontier: FrontierItem[], memory: ExplorationMemory): FrontierItem[] {
    return [...frontier]
      .map((f) => ({ f, score: this.strategy.score(f, memory) + f.mutationSignals * 6 - f.depth * 1.2 }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.f);
  }
}
