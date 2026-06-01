import { ExploitVerifier, ExploitEvidence } from './exploit-verifier';
import { PlaywrightMultiSessionRuntime } from '../execution/playwright-multi-session';
import { ReplayCoordinator } from '../replay/replay-coordinator';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';
import { ReplayMutationPlan } from '../replay/replay-mutation-plan';
import { LivePerturbationInterceptor } from '../instrumentation/live-perturbation-interceptor';

export interface ReplayLineageSummary {
  readonly originalExchangeId: string;
  readonly targetRole: string;
  readonly mutationPlanId: string;
  readonly isExploited: boolean;
  readonly classification: string;
  readonly normalizedUri: string;
}

export class ControlledReplayHarness {
  constructor(
    private readonly runtime: PlaywrightMultiSessionRuntime,
    private readonly interceptor: LivePerturbationInterceptor
  ) {}

  /**
   * Executes a list of verification inputs sequentially, guaranteeing zero parallel fanout or concurrency drift.
   * Runs exactly one target replay validation at a time.
   */
  public async executeSequentially(
    inputs: ReadonlyArray<{
      readonly exchange: CanonicalHttpExchange;
      readonly targetSessionId: string;
      readonly mutationPlan: ReplayMutationPlan;
      readonly reproducibilityCount?: number;
    }>
  ): Promise<ReadonlyArray<ExploitEvidence>> {
    const results: Array<ExploitEvidence> = [];

    // Pure sequential execution
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];

      // To guarantee total target context isolation, instantiate a fresh ReplayCoordinator
      // and ExploitVerifier for each single task.
      const coordinator = new ReplayCoordinator();
      const verifier = new ExploitVerifier(this.runtime, coordinator);

      const evidence = await verifier.verifyExploit(
        input.exchange,
        input.targetSessionId,
        input.mutationPlan,
        this.interceptor,
        input.reproducibilityCount || 1
      );

      results.push(evidence);
    }

    return Object.freeze(results);
  }

  /**
   * Generates a stable, human-readable summary of the replay execution lineage.
   */
  public generateLineageSummary(evidence: ExploitEvidence): ReplayLineageSummary {
    const summary: ReplayLineageSummary = {
      originalExchangeId: evidence.originalExchange.exchangeId.id,
      targetRole: evidence.roleSessionLineage.replayedRole,
      mutationPlanId: evidence.mutationLineage.planId,
      isExploited: evidence.structuralVerificationOutcome.isExploited,
      classification: evidence.structuralVerificationOutcome.isExploited ? 'IDOR_BAC_VIOLATION' : 'DENIED_OR_MISMATCHED',
      normalizedUri: evidence.originalExchange.request.url
    };

    return Object.freeze(summary);
  }
}
