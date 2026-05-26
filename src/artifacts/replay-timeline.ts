import { MinimalReplayRecipe } from '../runtime/replay/replay-minimizer';
import { SubmissionFinding } from '../runtime/validation/false-positive-eliminator';

export interface ReplayTimelineEvent {
  timeOffset: string; // e.g., "T+0", "T+3"
  description: string;
}

export class ReplayTimelineGenerator {
  /**
   * Translates lineage into a T+X style narrative for fast human comprehension.
   */
  public generate(finding: SubmissionFinding, minimalRecipe: MinimalReplayRecipe): ReplayTimelineEvent[] {
    const proof = finding.proofs[0];
    if (!proof) {
      return [];
    }

    const timeline: ReplayTimelineEvent[] = [];
    
    // T+0
    timeline.push({
      timeOffset: 'T+0',
      description: `User Login (${finding.targetRole})`
    });

    let currentT = 1;
    
    for (let i = 0; i < minimalRecipe.minimalExchanges.length - 1; i++) {
      const ex = minimalRecipe.minimalExchanges[i];
      timeline.push({
        timeOffset: `T+${currentT}`,
        description: `State-building request sent: ${ex.request.method} ${ex.request.url}`
      });
      currentT++;
    }

    // Mutation
    timeline.push({
      timeOffset: `T+${currentT}`,
      description: `Target API intercepted: ${proof.originalExchange.request.method} ${proof.originalExchange.request.url}`
    });
    currentT++;

    timeline.push({
      timeOffset: `T+${currentT}`,
      description: `Mutation Injected (Target Entity: ${finding.targetEntityId})`
    });
    currentT++;

    timeline.push({
      timeOffset: `T+${currentT}`,
      description: `Mutated Response Received (Status: ${proof.statusDelta.after})`
    });
    currentT++;

    if (finding.type === 'IDOR_CANDIDATE' || finding.type === 'PRIVILEGE_ESCALATION_CANDIDATE') {
      timeline.push({
        timeOffset: `T+${currentT}`,
        description: `Sensitive data successfully leaked into response body`
      });
    }

    return timeline;
  }
}
