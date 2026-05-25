import { InvestigationPipeline } from '../../intelligence/orchestration/investigation-pipeline';
import { DeterministicIdGenerator } from '../replay/replay-seed';
import { StateDependencyDetector } from '../replay/state-dependency-detector';
import { ReproducibilityEngine } from '../reproducibility/reproducibility-engine';
import { ReplayMinimizer } from '../replay/replay-minimizer';
import { TriagerVerificationMode } from '../verification/triager-verification';
import { FalsePositiveEliminator } from '../validation/false-positive-eliminator';
import { ReplayRecipeGenerator } from '../../artifacts/replay-recipe-generator';
import { ReplayTimelineGenerator } from '../../artifacts/replay-timeline';
import { EvidenceRedactor, InternalEvidenceBundle } from '../evidence/evidence-redactor';
import { InvestigationNarrativeGenerator } from '../../artifacts/investigation-narrative';
import { SubmissionReadinessGate } from '../../artifacts/submission-readiness';
import { BundleManifestGenerator } from '../../artifacts/bundle-manifest';
import { SubmissionPackageExport } from '../../artifacts/submission-package';
import { InvestigationProvenanceCapture } from '../../artifacts/investigation-provenance';
import { EnvironmentFingerprintCapture } from '../environment/environment-fingerprint';
import { PlaywrightMultiSessionRuntime } from '../execution/playwright-multi-session';

/**
 * PURE ORCHESTRATOR
 * This class coordinates the execution of Phase 9.3 productization components.
 * It contains NO business logic. It delegates all decisions to the specialized engines.
 */
export class InvestigationRuntime {
  
  // Intelligence components (Phase 8 & 9.1)
  private discoveryPipeline = new InvestigationPipeline(); 
  
  // Phase 9.3 Operational Productization Components
  private dependencyDetector = new StateDependencyDetector();
  private reproducibilityEngine = new ReproducibilityEngine();
  private minimizer = new ReplayMinimizer();
  private triagerVerification = new TriagerVerificationMode();
  private fpEliminator = new FalsePositiveEliminator();
  private recipeGenerator = new ReplayRecipeGenerator();
  private timelineGenerator = new ReplayTimelineGenerator();
  private redactor = new EvidenceRedactor();
  private narrativeGenerator = new InvestigationNarrativeGenerator();
  private readinessGate = new SubmissionReadinessGate();
  private manifestGenerator = new BundleManifestGenerator();
  private packageExport = new SubmissionPackageExport();
  private provenanceCapture = new InvestigationProvenanceCapture();
  private envCapture = new EnvironmentFingerprintCapture();

  public async runFullInvestigation(domain: string, runtime: PlaywrightMultiSessionRuntime, outputDir: string): Promise<string[]> {
    // 1. Run Intelligence Discovery (Phase 9.1 & 9.2) to get ValidatedFindings
    const rawBundle = await this.discoveryPipeline.runFullInvestigation(domain, runtime);
    
    if (!rawBundle.differentialAnalysis || !rawBundle.differentialAnalysis.findings) {
        return [];
    }
    
    // Convert generic findings to ValidatedFinding type based on intelligence bundle
    // For orchestration purposes, we assume we have an array of these.
    const findings: any[] = rawBundle.differentialAnalysis.findings.filter(f => f.isValidated && f.proofs?.length);
    
    const successfulBundles: string[] = [];

    for (const finding of findings) {
       // We must recreate the lineage/proof context as it's a simulated execution block
       // We mock some of the internal structures since this is a pure orchestrator template.
       
       const mockSeed = DeterministicIdGenerator.createSeed(
          `session_${finding.targetEndpoint}`, 
          `lineage_${finding.targetEndpoint}`, 
          `mutation_${finding.targetEndpoint}`
       );

       const mockLineage = { sourceExchangeIds: [] } as any;
       const mockExchanges = [] as any[];
       const mockProof = finding.proofs[0] as any;
       const targetEntity = finding.targetEndpoint;

       // 2. State Dependency (Delegated)
       const dependency = this.dependencyDetector.analyze(mockLineage, mockExchanges);

       // 3. Reproducibility Engine (Delegated)
       const reproducibility = await this.reproducibilityEngine.testReproducibility(
           finding, mockProof, dependency, runtime, targetEntity
       );

       // 4. Triager Verification (Delegated)
       const minimalRecipe = this.minimizer.minimize(mockLineage, mockExchanges);
       const verification = await this.triagerVerification.verify(minimalRecipe, runtime, targetEntity);

       // 5. False Positive Elimination (Delegated)
       const submissionFinding = this.fpEliminator.filter(finding, reproducibility, verification, mockExchanges);
       
       if (!submissionFinding.isSubmissionReady) {
          continue;
       }

       // 6. Artifact Generation (Delegated)
       const recipe = this.recipeGenerator.generate(submissionFinding, minimalRecipe);
       const timeline = this.timelineGenerator.generate(submissionFinding, minimalRecipe);
       const narrative = this.narrativeGenerator.generate(submissionFinding, recipe);
       
       const internalEvidence: InternalEvidenceBundle = { exchanges: mockExchanges, sessionIdentifiers: ['secret_cookie'] };
       const redactedEvidence = this.redactor.redact(internalEvidence);
       
       const provenance = this.provenanceCapture.capture(submissionFinding, mockSeed);
       
       // 7. Readiness Gate (Delegated)
       const readiness = this.readinessGate.evaluate(submissionFinding, minimalRecipe, verification, narrative);
       
       if (readiness.ready) {
           const manifest = this.manifestGenerator.generate(provenance, {
              'report.md': narrative,
              'poc.sh': recipe.curlCommand
           });
           
           // 8. Export (Delegated)
           const bundlePath = await this.packageExport.exportPackage(
               readiness, 
               manifest, 
               narrative, 
               redactedEvidence, 
               recipe.curlCommand,
               outputDir
           );
           
           successfulBundles.push(bundlePath);
       } else {
       }
    }

    return successfulBundles;
  }
}
