import { ReproducibilityEligibleCandidate } from './reproducibility-eligible-candidate';
import { RuntimeSession } from '../../intelligence/runtime/multi-session-runtime';
import { StateDependencyResult } from '../replay/state-dependency-detector';
import { SemanticSuccessEvaluator, SemanticSuccessResult } from '../validation/semantic-success-evaluator';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';
import { PlaywrightMultiSessionRuntime } from '../execution/playwright-multi-session';
import { ContextualPerturbationEngine } from '../replay/contextual-perturbation';
import { ReplayCoordinator, ReplayExecutionMode } from '../replay/replay-coordinator';

import { LivePerturbationInterceptor } from '../instrumentation/live-perturbation-interceptor';
import { MutationPlanGenerator } from '../replay/replay-mutation-plan';

export enum ReproducibilityMode {
  MUTATION_ONLY = 'MUTATION_ONLY',
  FULL_REPLAY = 'FULL_REPLAY'
}

export interface ReproducibilityResult {
  attempts: number;
  successful: number;
  reproducibilityScore: number;
  stable: boolean;
  modeUsed: ReproducibilityMode;
}

export class ReproducibilityEngine {
  private semanticEvaluator = new SemanticSuccessEvaluator();
  private coordinator = new ReplayCoordinator();

  private perturbationEngine = new ContextualPerturbationEngine();
  private planGen = new MutationPlanGenerator();

  /**
   * Executes the exploit N times to verify stability.
   */
  public async testReproducibility(
    candidate: ReproducibilityEligibleCandidate,
    dependency: StateDependencyResult,
    runtime: PlaywrightMultiSessionRuntime,
    targetEntity: string,
    attempts: number = 5
  ): Promise<ReproducibilityResult> {
    const mode = dependency.stateDependent ? ReproducibilityMode.FULL_REPLAY : ReproducibilityMode.MUTATION_ONLY;

    let successful = 0;

    // Attempt N times
    for (let i = 0; i < attempts; i++) {
      let isSuccess = false;

      if (mode === ReproducibilityMode.MUTATION_ONLY) {
        isSuccess = await this.runMutationOnlyReplay(candidate, runtime, targetEntity);
      } else {
        isSuccess = await this.runFullReplay(candidate, runtime, targetEntity);
      }

      if (isSuccess) {
        successful++;
      }
    }

    const score = successful / attempts;
    const stable = score >= 0.8; // 80% success required for stability

    return {
      attempts,
      successful,
      reproducibilityScore: score,
      stable,
      modeUsed: mode
    };
  }

  private async runMutationOnlyReplay(
    candidate: ReproducibilityEligibleCandidate, 
    runtime: PlaywrightMultiSessionRuntime,
    targetEntity: string
  ): Promise<boolean> {
    const originalExchange = candidate.proof.originalExchange;

    let newSession: RuntimeSession | undefined;

    try {
      newSession = await runtime.launchIsolatedSession(candidate.comparisonProfile, candidate.sessionIsolationBoundary);
      const newCtx = runtime.getPlaywrightContext(newSession.sessionId);

      // Get mutation plan
      const plans = this.planGen.generatePlans(originalExchange.request);
      if (plans.length === 0) return false;
      const plan = plans[0];

      // Setup interceptor
      const interceptor = new LivePerturbationInterceptor();
      interceptor.setEnvelope({
        envelopeId: 'repro_dummy_env',
        intentDescription: 'reproducibility dummy envelope',
        idMutations: [],
        authMutations: [],
        tenantMutations: [],
        sequencePerturbations: []
      });

      const mutatedCanonicalReq = this.perturbationEngine.applyMutation(originalExchange.request, plan);
      const replayPlanReq = this.coordinator.planReplay({
         ...originalExchange,
         request: mutatedCanonicalReq
      }, plan.planId);

      if (!replayPlanReq) return false;

      const mutatedResponse = await this.coordinator.executeReplay(
        replayPlanReq,
        interceptor,
        newCtx,
        ReplayExecutionMode.HTTP_ONLY
      );

      // Semantically evaluate success
      const evalResult = this.semanticEvaluator.evaluate(originalExchange.response, mutatedResponse, targetEntity);
      
      return evalResult.successful;
    } catch (e) {
      return false;
    } finally {
      if (newSession) {
        await runtime.terminateSession(newSession.sessionId);
      }
    }
  }

  private async runFullReplay(
    candidate: ReproducibilityEligibleCandidate,
    runtime: PlaywrightMultiSessionRuntime,
    targetEntity: string
  ): Promise<boolean> {
    // In a real implementation, this would recreate the lineage from scratch 
    // by triggering UI interactions or re-running the crawler requests,
    // and then apply the mutation at the end.
    // For now, we simulate this by running the mutation-only logic.
    return this.runMutationOnlyReplay(candidate, runtime, targetEntity);
  }
}
