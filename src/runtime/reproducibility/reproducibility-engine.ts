import { ValidatedFinding } from '../../intelligence/validation/exploit-validation-engine';
import { ExploitProof } from '../evidence/exploit-proof-capture';
import { StateDependencyResult } from '../replay/state-dependency-detector';
import { SemanticSuccessEvaluator, SemanticSuccessResult } from '../validation/semantic-success-evaluator';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';
import { PlaywrightMultiSessionRuntime } from '../execution/playwright-multi-session';
import { ContextualPerturbationEngine } from '../replay/contextual-perturbation';
import { ReplayCoordinator, ReplayExecutionMode } from '../replay/replay-coordinator';
import { ReplayBranchContext } from '../replay/replay-branch';
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
  private branchContext = new ReplayBranchContext();
  private perturbationEngine = new ContextualPerturbationEngine();
  private planGen = new MutationPlanGenerator();

  /**
   * Executes the exploit N times to verify stability.
   */
  public async testReproducibility(
    finding: ValidatedFinding,
    proof: ExploitProof,
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
        isSuccess = await this.runMutationOnlyReplay(finding, proof, runtime, targetEntity);
      } else {
        isSuccess = await this.runFullReplay(finding, proof, runtime, targetEntity);
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
    finding: ValidatedFinding, 
    proof: ExploitProof, 
    runtime: PlaywrightMultiSessionRuntime,
    targetEntity: string
  ): Promise<boolean> {
    const originalExchange = proof.originalExchange;
    
    // Retrieve original context
    const originalCtx = runtime.getPlaywrightContext(originalExchange.sessionId);
    const originalPage = originalCtx.pages()[0];
    
    // Fork context for deterministic replay
    const snapshot = await this.branchContext.captureSnapshot(originalExchange.sessionId, originalPage);
    const newCtx = await runtime.getBrowser().newContext();
    const newPage = await newCtx.newPage();
    const fork = await this.branchContext.forkSession(snapshot, newCtx, newPage);

    // Get mutation plan
    const plans = this.planGen.generatePlans(originalExchange.request);
    if (plans.length === 0) return false;
    const plan = plans[0];

    // Setup interceptor
    const interceptor = new LivePerturbationInterceptor();
    interceptor.setEnvelope({ idMutations: [], authMutations: [], tenantMutations: [] }); // dummy envelope

    const mutatedCanonicalReq = this.perturbationEngine.applyMutation(originalExchange.request, plan);
    const replayPlanReq = this.coordinator.planReplay({
       ...originalExchange,
       request: mutatedCanonicalReq
    }, plan.planId);

    if (!replayPlanReq) return false;

    try {
      const mutatedResponse = await this.coordinator.executeReplay(
        replayPlanReq,
        interceptor,
        fork.browserContext,
        ReplayExecutionMode.HTTP_ONLY
      );

      // Semantically evaluate success
      const evalResult = this.semanticEvaluator.evaluate(originalExchange.response, mutatedResponse, targetEntity);
      
      await newCtx.close();
      return evalResult.successful;
    } catch (e) {
      await newCtx.close();
      return false;
    }
  }

  private async runFullReplay(
    finding: ValidatedFinding, 
    proof: ExploitProof, 
    runtime: PlaywrightMultiSessionRuntime,
    targetEntity: string
  ): Promise<boolean> {
    // In a real implementation, this would recreate the lineage from scratch 
    // by triggering UI interactions or re-running the crawler requests,
    // and then apply the mutation at the end.
    // For now, we simulate this by running the mutation-only logic.
    return this.runMutationOnlyReplay(finding, proof, runtime, targetEntity);
  }
}
