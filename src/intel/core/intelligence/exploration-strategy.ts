export interface CandidateAction {
  id: string;
  route: string;
  actionType: 'click' | 'submit' | 'navigate' | 'scroll' | 'modal-open';
  text?: string;
  target?: string;
  stateSignature: string;
  metadata?: Record<string, unknown>;
}

export interface StrategyState {
  visitedSignatures: Set<string>;
  seenActions: Set<string>;
  currentAuthState: 'anonymous' | 'authenticated' | 'elevated';
}

export class ExplorationStrategy {
  public score(action: CandidateAction, state: StrategyState): number {
    let score = 0;
    if (!state.seenActions.has(action.id)) score += 15;
    if (!state.visitedSignatures.has(action.stateSignature)) score += 12;
    if (/(save|create|delete|update|checkout|transfer|role|admin)/i.test(action.text ?? action.target ?? '')) score += 25;
    if (action.actionType === 'submit') score += 10;
    if (state.currentAuthState !== 'anonymous' && /(settings|account|admin|billing)/i.test(action.route)) score += 18;
    if (/(next|continue|verify|confirm)/i.test(action.text ?? '')) score += 8;
    if (/(logout|home)/i.test(action.text ?? '')) score -= 7;
    return score;
  }

  public prioritize(candidates: CandidateAction[], state: StrategyState): CandidateAction[] {
    return [...candidates]
      .map((c) => ({ c, s: this.score(c, state) }))
      .sort((a, b) => b.s - a.s)
      .map((r) => r.c);
  }

  public shouldStop(state: StrategyState, frontierSize: number, actionBudgetLeft: number): boolean {
    return actionBudgetLeft <= 0 || frontierSize === 0 || state.visitedSignatures.size > 2000;
  }
}
