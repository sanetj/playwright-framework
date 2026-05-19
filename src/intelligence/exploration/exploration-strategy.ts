export interface ExplorationCandidate {
  id: string;
  route: string;
  action: string;
  stateSignature: string;
  authState: 'anonymous' | 'authenticated' | 'elevated';
  hints: string[];
}

export interface ExplorationMemory {
  visitedStates: Set<string>;
  replayedChains: Set<string>;
}

export class ExplorationStrategy {
  score(c: ExplorationCandidate, m: ExplorationMemory): number {
    let s = 0;
    if (!m.visitedStates.has(c.stateSignature)) s += 30;
    if (/(create|delete|update|transfer|checkout|submit|invite|role|admin)/i.test(c.action)) s += 25;
    if (c.authState !== 'anonymous') s += 10;
    if (c.hints.some((h) => /(mutation|privilege|sensitive|hidden)/i.test(h))) s += 20;
    if (/(logout|cancel|back)/i.test(c.action)) s -= 8;
    return s;
  }

  prioritize(candidates: ExplorationCandidate[], memory: ExplorationMemory): ExplorationCandidate[] {
    return [...candidates].sort((a, b) => this.score(b, memory) - this.score(a, memory));
  }

  shouldExplore(c: ExplorationCandidate, memory: ExplorationMemory): boolean {
    if (memory.visitedStates.has(c.stateSignature) && !/(admin|checkout|transfer|role)/i.test(c.action)) return false;
    return true;
  }
}
