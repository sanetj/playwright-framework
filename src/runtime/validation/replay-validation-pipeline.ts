import { DifferentialFinding } from '../../intelligence/differentials/concrete-differential-engine';
import { MutationPlanGenerator } from '../replay/replay-mutation-plan';
import { ReplayCoordinator, ReplayExecutionMode } from '../replay/replay-coordinator';
import { ContextualPerturbationEngine } from '../replay/contextual-perturbation';
import { LivePerturbationInterceptor } from '../instrumentation/live-perturbation-interceptor';
import { ReplayBranchContext } from '../replay/replay-branch';
import { MutationRiskClassifier, MutationRiskLevel } from '../governance/mutation-risk-classifier';
import { ProofSemanticValidator } from '../../runtime/validation/proof-semantic-validator';
import { ExploitProof, ProofClassification } from '../evidence/exploit-proof-capture';
import { ExploitValidationEngine, ValidatedFinding } from '../../runtime/validation/exploit-validation-engine';
import { PlaywrightMultiSessionRuntime } from '../execution/playwright-multi-session';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';
import { ReplayPerturbationEnvelope } from '../../intelligence/perturbation/governed-perturbation';
import { RuntimeSession } from '../../intelligence/runtime/multi-session-runtime';

export class ReplayValidationPipeline {
  private planGen = new MutationPlanGenerator();
  private coordinator = new ReplayCoordinator();
  private riskClassifier = new MutationRiskClassifier();
  private semanticValidator = new ProofSemanticValidator();
  private validationEngine = new ExploitValidationEngine();
  private branchContext = new ReplayBranchContext();
  private perturbationEngine = new ContextualPerturbationEngine();

  public async validateFinding(
    finding: DifferentialFinding,
    runtime: PlaywrightMultiSessionRuntime,
    originalExchange: CanonicalHttpExchange
  ): Promise<ValidatedFinding | null> {
    
    // 1. Generate Mutation Plans
    const plans = this.planGen.generatePlans(originalExchange.request);
    if (plans.length === 0) return null;
    
    // For simplicity, take the first valid plan
    const plan = plans[0];

    // 2. Risk Classification
    const risk = this.riskClassifier.classify(plan, originalExchange.request.method);
    if (!this.riskClassifier.isExecutionAllowed(risk)) {
      return null;
    }

    // 3. Branch Context (we do BROWSER_CONTEXT mode if we want to restore full state)
    // For this example, we will just use HTTP_ONLY against the existing session's context if possible
    // Wait, to do it properly with ReplayBranchContext:
    const originalCtx = runtime.getPlaywrightContext(originalExchange.sessionId);
    const originalPage = originalCtx.pages()[0]; // assume one page
    
    const snapshot = await this.branchContext.captureSnapshot(originalExchange.sessionId, originalPage);
    const originalSession = runtime.activeSessions.get(originalExchange.sessionId);
    if (!originalSession) return null;

    let newSession: RuntimeSession | undefined;

    try {
      newSession = await runtime.launchIsolatedSession(originalSession.roleProfile, originalSession.isolationBoundary);
      const newCtx = runtime.getPlaywrightContext(newSession.sessionId);
      const newPage = await newCtx.newPage();
      const fork = await this.branchContext.forkSession(snapshot, newCtx, newPage);

      // 4. Setup Interceptor and Coordinator
      const interceptor = new LivePerturbationInterceptor();
      // In a full implementation, we map ReplayMutationPlan -> ReplayPerturbationEnvelope here.
      // For now, we'll construct a dummy envelope to satisfy the interceptor if needed.
      const envelope: ReplayPerturbationEnvelope = {
         envelopeId: 'val_dummy_env',
         intentDescription: 'validation dummy envelope',
         idMutations: [],
         authMutations: [],
         tenantMutations: [],
         sequencePerturbations: []
      };
      interceptor.setEnvelope(envelope);

      const targetIdorValue = plan.mutations.find(m => m.injectedValue)?.injectedValue || '';

      // We apply contextual mutation to get a deterministic plan
      const mutatedCanonicalReq = this.perturbationEngine.applyMutation(originalExchange.request, plan);
      const replayPlanReq = this.coordinator.planReplay({
         ...originalExchange,
         request: mutatedCanonicalReq
      }, plan.planId);

      if (!replayPlanReq) return null;

      // 5. Execute Replay
      const mutatedResponse = await this.coordinator.executeReplay(
        replayPlanReq,
        interceptor,
        fork.browserContext,
        ReplayExecutionMode.HTTP_ONLY // Can use BROWSER_CONTEXT as needed
      );

      // 6. Capture Proof and Semantically Validate
      const semanticResult = this.semanticValidator.validate(originalExchange.response, mutatedResponse, targetIdorValue);

      const proof: ExploitProof = {
        proofId: `proof_${Date.now()}`,
        lineage: {
          findingId: finding.findingId || 'unknown',
          replayId: replayPlanReq.executionId,
          sourceExchangeIds: [originalExchange.exchangeId],
          mutationIds: [plan.planId],
          sessionLineage: [snapshot.sessionId, fork.forkId],
          roleLineage: [finding.targetRole],
          proofArtifacts: []
        },
        originalExchange,
        mutatedResponse,
        statusDelta: { before: originalExchange.response?.status || 0, after: mutatedResponse.status },
        confidence: semanticResult.confidence,
        classification: 'IDOR' // Simplify for now
      };

      // 7. Validation Engine
      const validated = this.validationEngine.validate(finding, proof);
      
      return validated;
    } finally {
      if (newSession) {
        await runtime.terminateSession(newSession.sessionId);
      }
    }
  }
}
