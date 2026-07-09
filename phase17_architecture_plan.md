# Phase 17 Architecture Plan — Empirical Evaluation, Benchmarking, and Scientific ROI Measurement

## Phase Overview

### Vision

Convert the platform from plausible architecture into measured browser security research infrastructure with reproducible claims about replay quality, proof quality, false-positive reduction, and ROI per hour.

### Architectural objective

Build benchmark, evaluation, and measurement architecture around the stable Phase 13–16 system without adding speculative intelligence.

### Why this phase exists

Research value and product credibility require empirical validation, not just architecture documents or successful demos.

### Relationship to previous phases

It consumes deterministic artifacts, proof quality, planning outputs, campaign memory, and knowledge provenance.

### Relationship to subsequent phases

It provides evidence needed to safely expose Phase 18 platform extension points and operational surfaces.

### Non-negotiable doctrines

* Replay remains canonical truth.
* Evidence remains canonical truth.
* The Investigation Pipeline owns orchestration.
* Bundle projection owns representation only.
* Derived intelligence never mutates canonical truth.
* Deterministic derived intelligence is preferred over heuristic convenience.
* AI, if introduced downstream in later work, remains advisory and never authoritative.

## Phase 17.1 — Benchmark Corpus Architecture

### Purpose

Define benchmark corpus structure for controlled vulnerable, safe, unstable, role-based, tenant, and workflow-dependent targets.

### Problem Statement

Without benchmark corpora, claims about replay and ROI cannot be compared or reproduced.

### Architectural Motivation

Benchmarks must reflect browser security investigation realities, not just unit fixtures.

### Capabilities Introduced

Corpus taxonomy; target metadata; ground-truth schema; role/resource seed model; safety classes.

### Capabilities Explicitly Excluded

No new scanner features; no public plugin ecosystem.

### New Subsystems

Benchmark Corpus Registry; Ground Truth Catalogue.

### Subsystem Changes

Research harness consumes platform artifacts but does not alter runtime authority.

### Contracts Introduced

BenchmarkTarget; GroundTruthFinding; TargetSafetyClass.

### Authority Changes

Benchmark authority evaluates, not validates live findings.

### Pipeline Changes

Pipeline can run in benchmark mode with fixture/corpus inputs.

### Determinism Requirements

Benchmark ordering and target setup deterministic.

### Repository Doctrines Affected

Scientific rigor; Evidence > conclusions.

### Dependencies

Phase 16 campaign baseline.

### Risks

Benchmarks may overfit; include negative and unstable targets.

### Verification Strategy

Corpus integrity tests.

### Success Criteria

Benchmark corpus can support precision/recall and determinism evaluation.

### Readiness Criteria for 17.2

17.2 begins when corpus schema is stable.

## Phase 17.2 — Determinism and Reproducibility Harness

### Purpose

Define harnesses that run identical investigations repeatedly and classify output variance.

### Problem Statement

Determinism claims must be measured, not assumed.

### Architectural Motivation

Research and high-confidence triage require reproducible bundles and replay outcomes.

### Capabilities Introduced

Repeated-run protocol; fixture mode; live variance classification; byte comparison; artifact diff taxonomy.

### Capabilities Explicitly Excluded

No new intelligence; no hiding variance.

### New Subsystems

Reproducibility Harness; Artifact Diff Classifier.

### Subsystem Changes

Harness wraps pipeline execution externally.

### Contracts Introduced

ReproducibilityRun; ArtifactDiff; VarianceClass.

### Authority Changes

Harness measures architecture; it is not investigation authority.

### Pipeline Changes

Pipeline exposes reproducible artifacts for comparison.

### Determinism Requirements

Harness itself must be deterministic.

### Repository Doctrines Affected

Determinism > heuristics.

### Dependencies

17.1 corpus.

### Risks

Live target nondeterminism may obscure framework issues; classify separately.

### Verification Strategy

Repeated-run benchmark suites.

### Success Criteria

Determinism score is measurable.

### Readiness Criteria for 17.3

17.3 begins when variance taxonomy is accepted.

## Phase 17.3 — Validation Accuracy Measurement

### Purpose

Define precision, recall, inconclusive, invalid replay, false-positive, and false-negative measurement over benchmark ground truth.

### Problem Statement

Validation quality cannot be optimized without measurement.

### Architectural Motivation

Bug bounty productivity depends on trusted findings and low noise.

### Capabilities Introduced

Confusion matrix semantics; inconclusive handling; invalid replay classification; vector-specific metrics.

### Capabilities Explicitly Excluded

No collapsing inconclusive into false negative; no single vanity score.

### New Subsystems

Validation Metrics Engine; Result-to-GroundTruth Mapper.

### Subsystem Changes

Evaluation consumes validation results and proof packages.

### Contracts Introduced

ValidationMetric; GroundTruthMapping; AccuracyReport.

### Authority Changes

Evaluation measures validation; it does not alter conclusions.

### Pipeline Changes

Pipeline benchmark mode exports validation outcomes.

### Determinism Requirements

Metric ordering and aggregation deterministic.

### Repository Doctrines Affected

Proof > probability; Evidence > conclusions.

### Dependencies

17.2 reproducibility harness.

### Risks

Ground truth may be incomplete; benchmark corpus must declare confidence.

### Verification Strategy

Known-vulnerable and known-safe target tests.

### Success Criteria

Validation accuracy is quantified by vector and condition.

### Readiness Criteria for 17.4

17.4 begins when accuracy metrics are trusted.

## Phase 17.4 — ROI per Investigation Hour Metrics

### Purpose

Define metrics for researcher leverage: valid findings per hour, replay attempts saved, duplicate work avoided, proof package readiness, and triage acceptance proxies.

### Problem Statement

The long-term objective is ROI per hour, not raw finding count.

### Architectural Motivation

Metrics must align architecture with bug bounty productivity.

### Capabilities Introduced

ROI metric definitions; cost accounting; human effort proxies; duplicate-work measurement; proof readiness weighting.

### Capabilities Explicitly Excluded

No payout prediction as truth; no gamified severity inflation.

### New Subsystems

ROI Metrics Engine; Investigation Cost Ledger.

### Subsystem Changes

Planning, proof quality, and knowledge outputs feed ROI reports.

### Contracts Introduced

RoiMetric; InvestigationCost; ResearcherLeverageReport.

### Authority Changes

ROI is optimization guidance, not validation authority.

### Pipeline Changes

Pipeline benchmark mode emits cost/effort events.

### Determinism Requirements

ROI calculations deterministic from event ledger.

### Repository Doctrines Affected

Maximize researcher leverage; minimize noisy exploration.

### Dependencies

17.3 validation metrics.

### Risks

Hard-to-measure human effort; start with transparent proxies.

### Verification Strategy

Scenario comparisons planned vs unplanned.

### Success Criteria

ROI impact of platform features becomes measurable.

### Readiness Criteria for 17.5

17.5 begins when ROI ledger is stable.

## Phase 17.5 — Comparative Baseline Framework

### Purpose

Define fair comparison against conventional Playwright automation, crawler/scanner baselines, and manual-like scripted workflows.

### Problem Statement

Research claims need baselines.

### Architectural Motivation

The platform must prove differentiated value beyond good engineering.

### Capabilities Introduced

Baseline categories; allowed capabilities; comparison protocols; artifact normalization; fairness constraints.

### Capabilities Explicitly Excluded

No vendor-specific claims without evidence; no cherry-picked targets.

### New Subsystems

Baseline Runner; Comparison Report Generator.

### Subsystem Changes

Evaluation harness invokes baselines separately from platform authority.

### Contracts Introduced

BaselineRun; ComparativeMetric; FairnessConstraint.

### Authority Changes

Baselines evaluate relative value, not internal truth.

### Pipeline Changes

No pipeline changes except benchmark export compatibility.

### Determinism Requirements

Comparison ordering and scoring deterministic.

### Repository Doctrines Affected

Scientific rigor; Architecture > shortcuts.

### Dependencies

17.4 ROI metrics.

### Risks

Baselines may be weak strawmen; document capabilities.

### Verification Strategy

Controlled comparison runs.

### Success Criteria

Platform value can be compared credibly.

### Readiness Criteria for 17.6

17.6 begins when baseline protocols are accepted.

## Phase 17.6 — Publication Artifact Packaging

### Purpose

Define reproducible artifact packages for papers, reports, and external review, including corpus version, runs, bundles, metrics, and environment fingerprints.

### Problem Statement

Publishable research requires inspectable artifacts.

### Architectural Motivation

Artifact packaging converts internal evidence into external scientific credibility.

### Capabilities Introduced

Artifact package schema; anonymization/redaction policy; reproducibility manifest; environment capture.

### Capabilities Explicitly Excluded

No leaking secrets; no unredacted live-target data.

### New Subsystems

Research Artifact Packager; Reproducibility Manifest Builder.

### Subsystem Changes

Bundle projection feeds research packages with additional metrics.

### Contracts Introduced

ResearchArtifactPackage; ReproducibilityManifest; RedactionDisclosure.

### Authority Changes

Artifact packager owns representation only.

### Pipeline Changes

Runs after evaluation reports.

### Determinism Requirements

Packages reproducible under fixture mode.

### Repository Doctrines Affected

Bundle owns representation only; Evidence > conclusions.

### Dependencies

17.5 comparative baselines.

### Risks

Privacy and target authorization risk; strict redaction/consent policies.

### Verification Strategy

Artifact round-trip and redaction tests.

### Success Criteria

External reviewers can reproduce claims.

### Readiness Criteria for 17.7

17.7 begins when packaging is safe.

## Phase 17.7 — Empirical Research Baseline

### Purpose

Integrate benchmarks, reproducibility, accuracy, ROI, comparisons, and artifact packaging into a research baseline.

### Problem Statement

Research infrastructure must be coherent before the platform exposes extension points.

### Architectural Motivation

Phase 18 extensibility should be guided by measured needs, not speculation.

### Capabilities Introduced

Research scorecard; accepted metrics; minimum benchmark set; publication-readiness checklist.

### Capabilities Explicitly Excluded

No plugin system yet; no marketplace; no external API commitments.

### New Subsystems

Research Baseline Registry; Evaluation Quality Gate.

### Subsystem Changes

Research harness becomes a first-class non-runtime subsystem.

### Contracts Introduced

ResearchBaseline; EvaluationQualityGate; PublicationReadiness.

### Authority Changes

Research evaluates, never validates live findings.

### Pipeline Changes

Pipeline remains unchanged; harness runs around it.

### Determinism Requirements

Research artifacts deterministic under fixture mode.

### Repository Doctrines Affected

Scientific rigor; Determinism > heuristics.

### Dependencies

17.1 through 17.6.

### Risks

Metrics overload; keep scorecards actionable.

### Verification Strategy

Full benchmark dry run.

### Success Criteria

Platform has credible empirical baseline.

### Readiness Criteria for 17.H

17.H begins when research baseline passes dry run.

## Phase 17.H — Architecture Hardening

### Purpose

Stabilize Phase 17 after its seven feature milestones and remove drift before certification. This milestone is not a feature phase and must not introduce new capability surface.

### Architecture improvements

* Re-check that Phase 17 additions preserve the Phase 12 Investigation Pipeline as orchestration authority.
* Remove duplicate concepts introduced during planning.
* Collapse terminology that overlaps with earlier phases.
* Ensure each new subsystem has one explicit authority and one forbidden-responsibility list.
* Verify every derived artifact references canonical evidence, replay outcomes, or prior derived artifacts explicitly.

### Determinism improvements

* Verify deterministic ordering for all Phase 17 outputs.
* Require stable identity material for every new artifact.
* Separate fixture-mode determinism from live-mode observed variance.
* Ensure time, environment, and policy inputs are explicit.

### Boundary improvements

* Confirm that derived intelligence never mutates canonical evidence.
* Confirm that bundle/export/projector layers remain representation-only.
* Confirm that planning, knowledge, research, or platform surfaces do not create validation conclusions.
* Confirm that runtime adapters and policy gates do not score or interpret vulnerabilities.

### Lifecycle improvements

* Verify lifecycle states for all Phase 17 artifacts.
* Define creation, consumption, finalization, and archival boundaries.
* Ensure failure and partial-completion states are explicit.
* Ensure cleanup obligations are represented where runtime resources are involved.

### Verification improvements

* Add architecture tests for Phase 17 authority boundaries.
* Add determinism tests for new derived artifacts.
* Add negative tests for doctrine violations.
* Add regression scenarios covering failure modes and edge cases.

### Compile-time improvements

* Strengthen type contracts so forbidden states are difficult or impossible to represent.
* Ensure contract names match authority boundaries.
* Avoid catch-all records unless the field is explicitly extension metadata.
* Ensure public DTOs are versioned when they cross phase or platform boundaries.

### Runtime improvements

* Add runtime assertions only where they enforce architectural invariants.
* Ensure runtime assertions report doctrine-specific failure reasons.
* Ensure assertions do not manufacture evidence or conclusions.

### Documentation improvements

* Update doctrine maps for Phase 17 authorities.
* Mark implementation-backed guarantees separately from planned future work.
* Update diagrams or tables only when they match implementation.
* Record intentionally excluded capabilities to prevent scope creep.

### Exit criteria

* No known Phase 17 authority conflict remains unresolved.
* Deterministic artifacts have explicit identity and ordering rules.
* Every new subsystem has a verification strategy.
* Documentation, tests, and contracts agree on authority boundaries.
* Phase 17.C can audit implementation without relying on aspiration.

## Phase 17.C — Architecture Certification and Architectural Tests

### Purpose

Certify that Phase 17 is architecturally correct before Phase 18 begins. This milestone exists solely to prove correctness, not to add features.

### Architecture audits

* Audit every Phase 17 subsystem against its declared authority.
* Compare implementation behavior to phase documents and doctrine.
* Identify any undocumented capability that became real implementation.
* Identify any documented capability that is not implemented or not enforced.

### Authority audits

* Verify replay remains canonical truth.
* Verify evidence remains canonical truth.
* Verify Investigation Pipeline remains orchestration authority.
* Verify bundle/export layers remain representation-only.
* Verify AI or downstream consumers remain advisory and downstream only.

### Boundary audits

* Check dependency direction from runtime to evidence to validation to derived intelligence to representation.
* Check that no derived subsystem imports forbidden concrete infrastructure.
* Check that no phase introduced duplicate authority for validation, planning, knowledge, or representation.

### Determinism audits

* Run deterministic fixture scenarios for all Phase 17 outputs.
* Compare identities, ordering, serialized artifacts, and bundle projections.
* Classify any variance as allowed observed-runtime variance or certification-blocking nondeterminism.

### Lifecycle audits

* Verify creation, mutation, finalization, archival, and failure states.
* Confirm completed artifacts cannot be mutated through public boundaries.
* Confirm cleanup and cancellation obligations are represented for runtime paths.

### Dependency audits

* Verify allowed dependency matrix.
* Verify forbidden import rules.
* Verify extension or adapter surfaces cannot bypass canonical authorities.

### Evidence doctrine audits

* Confirm every conclusion traces back to replay evidence or is explicitly marked derived/advisory.
* Confirm negative, inconclusive, or suppressed outcomes are not erased.
* Confirm evidence references resolve.

### Bundle doctrine audits

* Confirm bundles project representation only.
* Confirm bundle projection does not generate new intelligence.
* Confirm redaction preserves traceability.

### Replay doctrine audits

* Confirm replay outcomes remain the only support for validated conclusions.
* Confirm replay strategy/planning/knowledge never replaces replay proof.
* Confirm invalid replay states are explicit.

### Implementation verification

* Inspect source paths changed during Phase 17.
* Run type checking and relevant architecture tests.
* Run targeted unit/integration tests for affected subsystems.
* Review generated artifacts for schema stability and determinism.

### Runtime verification

* Execute representative fixture-mode investigations.
* Execute at least one live-mode or controlled-server investigation where relevant.
* Verify failure-path behavior and cleanup.

### Regression strategy

* Preserve Phase 12 baseline behavior.
* Preserve prior phase certification fixtures.
* Add regression fixtures for every new invariant.
* Track certification-blocking regressions separately from known accepted live variance.

### Certification criteria

* All hardening exit criteria pass.
* No unresolved critical authority violation exists.
* No unsupported conclusion can be represented as replay-backed truth.
* Deterministic fixture outputs are stable.
* Documentation describes implementation rather than aspiration.

### Promotion criteria for Phase 18

Phase 18 may begin only when Phase 17.C certifies that Phase 17 artifacts are stable, deterministic where required, authority-safe, and regression-protected.
