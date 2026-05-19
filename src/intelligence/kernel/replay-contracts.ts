import { NormalizedEvent } from '../events/normalized-event';

export interface ReplayContract {
  contractVersion: '1.0';
  chainId: string;
  requiredTransitions: string[];
  allowedMissingTransitions: number;
  requiresStateLineage: boolean;
  readonlyMode: true;
}

export interface ReplaySnapshot {
  sessionId: string;
  chainId: string;
  orderedEventIds: string[];
  stateLineage: Array<{ before?: string; after?: string; eventId: string }>;
  generatedAt: number;
}

export interface ReplayDriftDetection {
  drift: boolean;
  missingTransitions: string[];
  outOfOrderEvents: string[];
  confidence: number;
}

export interface ReplayConfidenceModel {
  lineageIntegrity: number;
  orderingIntegrity: number;
  transitionCoverage: number;
  overall: number;
}

export class ReplayDeterminismLayer {
  public snapshot(events: NormalizedEvent[], chainId: string): ReplaySnapshot {
    const chainEvents = events.filter((e) => e.chainId === chainId).sort((a, b) => (a.ts - b.ts) || (a.seq - b.seq));
    return {
      sessionId: chainEvents[0]?.actor.sessionId ?? 'unknown',
      chainId,
      orderedEventIds: chainEvents.map((e) => e.id),
      stateLineage: chainEvents.map((e) => ({ before: e.beforeState, after: e.afterState, eventId: e.id })),
      generatedAt: Date.now(),
    };
  }

  public evaluate(snapshot: ReplaySnapshot, observedOrderedEventIds: string[], contract: ReplayContract): ReplayDriftDetection {
    const missingTransitions = contract.requiredTransitions.filter((r) => !observedOrderedEventIds.includes(r));
    const outOfOrderEvents = observedOrderedEventIds.filter((id, idx) => snapshot.orderedEventIds[idx] && snapshot.orderedEventIds[idx] !== id);
    const drift = missingTransitions.length > contract.allowedMissingTransitions || outOfOrderEvents.length > 0;
    const coverage = Math.max(0, 1 - missingTransitions.length / Math.max(1, contract.requiredTransitions.length));
    const ordering = Math.max(0, 1 - outOfOrderEvents.length / Math.max(1, observedOrderedEventIds.length));
    return {
      drift,
      missingTransitions,
      outOfOrderEvents,
      confidence: Number(((coverage * 0.6 + ordering * 0.4) * 100).toFixed(2)),
    };
  }

  public confidence(snapshot: ReplaySnapshot, observedOrderedEventIds: string[]): ReplayConfidenceModel {
    const lineageKnown = snapshot.stateLineage.filter((s) => s.before || s.after).length;
    const lineageIntegrity = lineageKnown / Math.max(1, snapshot.stateLineage.length);
    const orderingIntegrity = observedOrderedEventIds.every((id, i) => snapshot.orderedEventIds[i] === id) ? 1 : 0.7;
    const transitionCoverage = observedOrderedEventIds.filter((id) => snapshot.orderedEventIds.includes(id)).length / Math.max(1, snapshot.orderedEventIds.length);
    const overall = Number(((lineageIntegrity * 0.35 + orderingIntegrity * 0.35 + transitionCoverage * 0.3) * 100).toFixed(2));
    return { lineageIntegrity, orderingIntegrity, transitionCoverage, overall };
  }
}
