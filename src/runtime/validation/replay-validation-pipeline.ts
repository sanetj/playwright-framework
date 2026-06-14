import { DifferentialFinding } from '../../intelligence/differentials/differential-finding';
import { MutationPlanGenerator } from '../replay/replay-mutation-plan';
import { ReplayCoordinator, ReplayExecutionMode } from '../replay/replay-coordinator';
import { ContextualPerturbationEngine } from '../replay/contextual-perturbation';
import { LivePerturbationInterceptor } from '../instrumentation/live-perturbation-interceptor';

import { MutationRiskClassifier, MutationRiskLevel } from '../governance/mutation-risk-classifier';
import { ProofSemanticValidator } from '../../runtime/validation/proof-semantic-validator';
import { ExploitProof, ProofClassification } from '../evidence/exploit-proof-capture';
import { ExploitValidationEngine, ValidatedFinding } from '../../runtime/validation/exploit-validation-engine';
import { PlaywrightMultiSessionRuntime } from '../execution/playwright-multi-session';
import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';
import { ReplayPerturbationEnvelope } from '../../intelligence/perturbation/governed-perturbation';
import { RuntimeSession } from '../../intelligence/runtime/multi-session-runtime';
import { ReplayEligibleCandidate } from './replay-eligible-candidate';

export class ReplayValidationPipeline {
  private planGen = new MutationPlanGenerator();
  private coordinator = new ReplayCoordinator();
  private riskClassifier = new MutationRiskClassifier();
  private semanticValidator = new ProofSemanticValidator();
  private validationEngine = new ExploitValidationEngine();

  private perturbationEngine = new ContextualPerturbationEngine();

  public async validateFinding(
    candidate: ReplayEligibleCandidate,
    runtime: PlaywrightMultiSessionRuntime
  ): Promise<ValidatedFinding | null> {
    
    // 1. Generate Mutation Plans
    const plans = this.planGen.generatePlans(candidate.baselineExchange.request);
    if (plans.length === 0) return null;
    
    // For simplicity, take the first valid plan
    const plan = plans[0];

    // 2. Risk Classification
    const risk = this.riskClassifier.classify(plan, candidate.baselineExchange.request.method);
    if (!this.riskClassifier.isExecutionAllowed(risk)) {
      return null;
    }

    let newSession: RuntimeSession | undefined;

    try {
      newSession = await runtime.launchIsolatedSession(candidate.comparisonProfile, candidate.sessionIsolationBoundary);
      const newCtx = runtime.getPlaywrightContext(newSession.sessionId);

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
      const mutatedCanonicalReq = this.perturbationEngine.applyMutation(candidate.baselineExchange.request, plan);
      const replayPlanReq = this.coordinator.planReplay({
         ...candidate.baselineExchange,
         request: mutatedCanonicalReq
      }, plan.planId);

      if (!replayPlanReq) return null;

      // 5. Execute Replay
      const mutatedResponse = await this.coordinator.executeReplay(
        replayPlanReq,
        interceptor,
        newCtx,
        ReplayExecutionMode.HTTP_ONLY // Can use BROWSER_CONTEXT as needed
      );

      // 6. Capture Proof and Semantically Validate
      const semanticResult = this.semanticValidator.validate(candidate.baselineExchange.response, mutatedResponse, targetIdorValue);

      const proof: ExploitProof = {
        proofId: `proof_${candidate.baselineExchange.exchangeId.id}_${plan.planId}`,
        lineage: {
          findingId: candidate.finding.findingId || 'unknown',
          replayId: replayPlanReq.executionId,
          sourceExchangeIds: [candidate.baselineExchange.exchangeId],
          mutationIds: [plan.planId],
          sessionLineage: [candidate.baselineExchange.sessionId],
          roleLineage: [candidate.finding.targetRole],
          proofArtifacts: []
        },
        originalExchange: candidate.baselineExchange,
        mutatedResponse,
        statusDelta: { before: candidate.baselineExchange.response?.status || 0, after: mutatedResponse.status },
        confidence: semanticResult.confidence,
        classification: 'IDOR' // Simplify for now
      };

      // 7. Validate Finding against engine
      return this.validationEngine.validate(candidate.finding, proof);
      
    } finally {
      if (newSession) {
        await runtime.terminateSession(newSession.sessionId);
      }
    }
  }
}
