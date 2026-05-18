import { createHash } from 'node:crypto';

export interface StateSnapshot {
  route: string;
  domShape: string;
  visibleActions: string[];
  activeComponents: string[];
  authState: string;
  entities: string[];
  modalStack: string[];
  featureFlags: string[];
}

export class StateSignatureEngine {
  private seen = new Map<string, StateSnapshot>();

  public signature(snapshot: StateSnapshot): string {
    const normalized = JSON.stringify({
      route: snapshot.route,
      domShape: snapshot.domShape,
      actions: [...snapshot.visibleActions].sort(),
      components: [...snapshot.activeComponents].sort(),
      authState: snapshot.authState,
      entities: [...snapshot.entities].sort(),
      modals: [...snapshot.modalStack].sort(),
      flags: [...snapshot.featureFlags].sort(),
    });
    return createHash('sha256').update(normalized).digest('hex').slice(0, 24);
  }

  public register(snapshot: StateSnapshot): string {
    const sig = this.signature(snapshot);
    if (!this.seen.has(sig)) this.seen.set(sig, snapshot);
    return sig;
  }

  public similarity(a: StateSnapshot, b: StateSnapshot): number {
    const score = [
      a.route === b.route ? 1 : 0,
      this.overlap(a.visibleActions, b.visibleActions),
      this.overlap(a.activeComponents, b.activeComponents),
      a.authState === b.authState ? 1 : 0,
      this.overlap(a.entities, b.entities),
      this.overlap(a.modalStack, b.modalStack),
      this.overlap(a.featureFlags, b.featureFlags),
    ];
    return score.reduce((x, y) => x + y, 0) / score.length;
  }

  public isDuplicate(snapshot: StateSnapshot, threshold = 0.92): boolean {
    for (const existing of this.seen.values()) {
      if (this.similarity(snapshot, existing) >= threshold) return true;
    }
    return false;
  }

  private overlap(a: string[], b: string[]): number {
    if (!a.length && !b.length) return 1;
    const sa = new Set(a);
    const sb = new Set(b);
    const inter = [...sa].filter((x) => sb.has(x)).length;
    const union = new Set([...a, ...b]).size || 1;
    return inter / union;
  }
}
