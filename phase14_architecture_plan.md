# Phase 14 Architecture Plan — Proof Quality, Replay Strategy, and False-Positive Suppression

## Phase Overview

### Vision

Increase expected bug bounty value by making replay validation deeper, more strategic, and more resistant to false positives while preserving replay as the sole authority for confirmed conclusions.

### Architectural objective

Extend the Phase 12 validation authority with explicit replay strategies, proof-quality dimensions, negative controls, minimization, false-positive suppression, and triage-grade proof packages.

### Why this phase exists

High ROI depends less on finding many candidates and more on validating the right candidates with convincing proof and minimal noise.

### Relationship to previous phases

It depends on Phase 13 canonical evidence, validation result integrity, immutable snapshots, bundle reproducibility, and governance checks.

### Relationship to subsequent phases

It feeds Phase 15 planning with reliable proof outcomes, negative knowledge, replay costs, and confidence dimensions.

### Non-negotiable doctrines

* Replay remains canonical truth.
* Evidence remains canonical truth.
* The Investigation Pipeline owns orchestration.
* Bundle projection owns representation only.
* Derived intelligence never mutates canonical truth.
* Deterministic derived intelligence is preferred over heuristic convenience.
* AI, if introduced downstream in later work, remains advisory and never authoritative.

## Phase 14.1 — Replay Strategy Taxonomy

### Purpose

Define strategy classes for validating IDOR, broken access control, tenant isolation, workflow replay, and state-dependent hypotheses.

### Problem Statement

Phase 12 validation can execute replay, but strategy selection is not yet a first-class architectural concern.

### Architectural Motivation

Replay quality improves when strategy choice is explicit, deterministic, and tied to authorization vector and evidence sufficiency.

### Capabilities Introduced

Replay strategy taxonomy; strategy eligibility rules; strategy risk classes; strategy-to-candidate mapping.

### Capabilities Explicitly Excluded

No autonomous exploration; no new candidate synthesis; no memory.

### New Subsystems

Replay Strategy Registry; Strategy Eligibility Evaluator.

### Subsystem Changes

Validation pipeline delegates strategy choice to a strategy authority without losing conclusion authority.

### Contracts Introduced

ReplayStrategy; StrategyEligibility; StrategyRiskProfile.

### Authority Changes

Replay strategy owns planning of validation attempts, not conclusions.

### Pipeline Changes

Validation stage gains deterministic strategy selection before replay execution.

### Determinism Requirements

Same candidate/evidence/policy selects same strategy order.

### Repository Doctrines Affected

Replay > inference; Planning > randomness.

### Dependencies

Phase 13 validation-result and canonical-evidence contracts.

### Risks

Strategy overfitting to current vectors; keep taxonomy extensible but bounded.

### Verification Strategy

Strategy-selection golden tests.

### Success Criteria

All supported vectors have documented replay strategy paths.

### Readiness Criteria for 14.2

14.2 can begin when strategy classes are stable.

## Phase 14.2 — Proof Quality Model

### Purpose

Define proof-quality dimensions that determine whether replay evidence is triage-grade, weak, unstable, or insufficient.

### Problem Statement

A validated finding is not necessarily a high-quality proof package for a bug bounty triager.

### Architectural Motivation

ROI per hour depends on proof that is clear, reproducible, minimal, and attributable to authorization failure rather than environmental noise.

### Capabilities Introduced

Proof dimensions: lineage completeness, replay stability, semantic delta, authorization specificity, minimality, reproducibility, environment stability.

### Capabilities Explicitly Excluded

No report prose generation; no AI scoring; no payout prediction.

### New Subsystems

Proof Quality Evaluator; Proof Quality Report.

### Subsystem Changes

Validation produces proof quality metadata; bundle projection represents it without changing it.

### Contracts Introduced

ProofQualityDimension; ProofQualityReport; TriageProofGrade.

### Authority Changes

Proof quality evaluates replay evidence but does not create validation conclusions.

### Pipeline Changes

Proof quality runs after validation result formation.

### Determinism Requirements

Proof-quality scoring uses deterministic component ordering and explicit tie-breaking.

### Repository Doctrines Affected

Proof > probability; Evidence > conclusions.

### Dependencies

14.1 strategy taxonomy.

### Risks

Risk of subjective grading; keep dimensions observable and evidence-linked.

### Verification Strategy

Fixture tests for proof-quality categories and edge cases.

### Success Criteria

Validated findings carry triage-grade proof diagnostics.

### Readiness Criteria for 14.3

14.3 begins when proof dimensions are complete.

## Phase 14.3 — Negative Replay Controls

### Purpose

Introduce negative controls that distinguish real authorization failure from replay artifact, public resource access, session confusion, or target instability.

### Problem Statement

Without negative controls, replay success can be misattributed to vulnerability rather than expected access or unstable environment.

### Architectural Motivation

False positives are the enemy of bug bounty ROI; negative controls increase trust in supported findings.

### Capabilities Introduced

Control replay taxonomy; public-access controls; same-role controls; owner-vs-non-owner controls; environment stability controls; control result interpretation.

### Capabilities Explicitly Excluded

No broad exploration; no destructive mutation; no probabilistic auto-confirmation.

### New Subsystems

Negative Control Planner; Control Result Interpreter.

### Subsystem Changes

Validation strategy must include controls where applicable; sufficiency can require controls for high-confidence support.

### Contracts Introduced

NegativeControlPlan; ControlReplayResult; ControlFailureReason.

### Authority Changes

Controls inform validation but do not override canonical replay evidence.

### Pipeline Changes

Validation stage adds controlled replay attempts around candidate replay.

### Determinism Requirements

Control ordering and interpretation are deterministic.

### Repository Doctrines Affected

False positives minimized; Replay > inference.

### Dependencies

14.2 proof quality model.

### Risks

Extra replay cost; planning must cap controls by ROI and risk.

### Verification Strategy

Tests where positive replay passes but controls disprove vulnerability.

### Success Criteria

Supported findings are distinguishable from uncontrolled replay successes.

### Readiness Criteria for 14.4

14.4 begins when control semantics are stable.

## Phase 14.4 — Replay Minimization and Proof Compression

### Purpose

Define minimization rules that reduce proof steps and evidence volume while preserving canonical lineage and replay validity.

### Problem Statement

Bug bounty proof packages lose value when they are noisy, redundant, or hard to reproduce.

### Architectural Motivation

A high-quality platform should package minimal convincing proof, not maximal raw telemetry.

### Capabilities Introduced

Replay minimization criteria; redundant exchange suppression; minimal mutation explanation; proof compression policy; reversible linkage to full evidence.

### Capabilities Explicitly Excluded

No deletion of canonical evidence; no lossy proof conclusions; no narrative generation.

### New Subsystems

Replay Proof Minimizer; Proof Compression Manifest.

### Subsystem Changes

Bundle projection can include minimized proof view plus full lineage references.

### Contracts Introduced

MinimizedProof; ProofCompressionManifest; RedundancyClass.

### Authority Changes

Minimizer owns representation of proof subset, not truth.

### Pipeline Changes

Runs after validation/control outcomes and before bundle projection.

### Determinism Requirements

Minimized output must be deterministic and reversible to canonical evidence references.

### Repository Doctrines Affected

Evidence exceeds conclusions; Bundle owns representation only.

### Dependencies

14.3 negative controls.

### Risks

Over-minimization may omit useful triage context; require completeness checks.

### Verification Strategy

Golden minimized-proof snapshots and lineage round-trip tests.

### Success Criteria

Proof packages are shorter without losing auditability.

### Readiness Criteria for 14.5

14.5 begins when minimization preserves traceability.

## Phase 14.5 — False-Positive Suppression Architecture

### Purpose

Define deterministic suppression rules for known false-positive classes without hiding evidence or deleting candidates.

### Problem Statement

Security platforms fail when they flood researchers with weak findings; suppression must reduce noise without corrupting truth.

### Architectural Motivation

Suppression should be a derived classification, not evidence deletion.

### Capabilities Introduced

False-positive taxonomy; suppression reasons; suppress-vs-deprioritize distinction; auditability requirements; override model.

### Capabilities Explicitly Excluded

No silent deletion; no AI-only suppression; no replacing validation.

### New Subsystems

False Positive Suppression Classifier; Suppression Audit Log.

### Subsystem Changes

Prioritization and bundle projection can mark suppressed outcomes; evidence and validation remain intact.

### Contracts Introduced

SuppressionDecision; SuppressionReason; SuppressionAuditRecord.

### Authority Changes

Suppression authority classifies derived output, not canonical evidence.

### Pipeline Changes

Pipeline adds suppression after proof-quality/control evaluation, before final prioritization/package.

### Determinism Requirements

Suppression decisions must be deterministic for same inputs.

### Repository Doctrines Affected

Evidence > conclusions; Authority > convenience.

### Dependencies

14.4 proof minimization.

### Risks

Suppression could hide true positives; require explicit reason and audit trail.

### Verification Strategy

Negative tests for suppressing without evidence; regression corpus of false positives.

### Success Criteria

No finding disappears without traceable suppression reason.

### Readiness Criteria for 14.6

14.6 begins when suppression is auditable.

## Phase 14.6 — Triage Acceptance Package Model

### Purpose

Define the structure of a triage-ready proof package optimized for bug bounty acceptance, distinct from canonical bundle representation.

### Problem Statement

Researchers need concise, convincing proof artifacts; canonical bundles are comprehensive but not always triage-optimized.

### Architectural Motivation

ROI improves when validated findings are packaged with minimal reproduction, evidence lineage, impact context, and control results.

### Capabilities Introduced

Triage package schema; reproduction recipe; proof summary fields; impact context references; acceptance checklist.

### Capabilities Explicitly Excluded

No AI-written final report as authority; no platform-specific submission automation.

### New Subsystems

Triage Package Projector; Acceptance Checklist Evaluator.

### Subsystem Changes

Bundle remains canonical representation; triage package is a derived view inside or alongside bundle.

### Contracts Introduced

TriagePackage; ReproductionStep; AcceptanceChecklist.

### Authority Changes

Triage package owns presentation for submission readiness, not validation truth.

### Pipeline Changes

Projection stage gains optional triage view from proof-quality data.

### Determinism Requirements

Triage package ordering and content must be stable.

### Repository Doctrines Affected

Bundle owns representation only; Proof > probability.

### Dependencies

14.5 suppression architecture.

### Risks

Overfitting to one bounty platform; keep package platform-neutral.

### Verification Strategy

Human-review checklist tests and fixture package snapshots.

### Success Criteria

Validated high-quality findings can be reviewed with minimal researcher effort.

### Readiness Criteria for 14.7

14.7 begins when package schema is stable.

## Phase 14.7 — Integrated Proof ROI Baseline

### Purpose

Integrate strategy, quality, controls, minimization, suppression, and triage package semantics into a proof-ROI baseline.

### Problem Statement

Phase 14 features must compose into a validation-quality system rather than isolated enhancements.

### Architectural Motivation

The next phase planner needs reliable replay cost, proof strength, suppression, and triage signals.

### Capabilities Introduced

Proof ROI scorecard; validation-cost accounting; proof readiness levels; handoff contract to Phase 15 planning.

### Capabilities Explicitly Excluded

No exploration planner; no memory; no benchmark publication yet.

### New Subsystems

Proof ROI Baseline; Validation Cost Ledger.

### Subsystem Changes

Prioritization can consume proof ROI signals after validation; planning will later consume them.

### Contracts Introduced

ProofRoiSignal; ValidationCostRecord; ProofReadinessLevel.

### Authority Changes

ROI signal is derived advisory intelligence, not truth authority.

### Pipeline Changes

Pipeline retains Phase 12 order with Phase 14 validation-quality enrichments.

### Determinism Requirements

All ROI signals must be deterministic and evidence-linked.

### Repository Doctrines Affected

Planning > randomness; Evidence > conclusions.

### Dependencies

14.1 through 14.6.

### Risks

Risk of confusing ROI with severity; separate proof ROI from vulnerability impact.

### Verification Strategy

End-to-end validation scenarios with proof ROI assertions.

### Success Criteria

Phase 14 proof baseline ready for hardening.

### Readiness Criteria for 14.H

14.H begins after proof ROI handoff is complete.

## Phase 14.H — Architecture Hardening

### Purpose

Stabilize Phase 14 after its seven feature milestones and remove drift before certification. This milestone is not a feature phase and must not introduce new capability surface.

### Architecture improvements

* Re-check that Phase 14 additions preserve the Phase 12 Investigation Pipeline as orchestration authority.
* Remove duplicate concepts introduced during planning.
* Collapse terminology that overlaps with earlier phases.
* Ensure each new subsystem has one explicit authority and one forbidden-responsibility list.
* Verify every derived artifact references canonical evidence, replay outcomes, or prior derived artifacts explicitly.

### Determinism improvements

* Verify deterministic ordering for all Phase 14 outputs.
* Require stable identity material for every new artifact.
* Separate fixture-mode determinism from live-mode observed variance.
* Ensure time, environment, and policy inputs are explicit.

### Boundary improvements

* Confirm that derived intelligence never mutates canonical evidence.
* Confirm that bundle/export/projector layers remain representation-only.
* Confirm that planning, knowledge, research, or platform surfaces do not create validation conclusions.
* Confirm that runtime adapters and policy gates do not score or interpret vulnerabilities.

### Lifecycle improvements

* Verify lifecycle states for all Phase 14 artifacts.
* Define creation, consumption, finalization, and archival boundaries.
* Ensure failure and partial-completion states are explicit.
* Ensure cleanup obligations are represented where runtime resources are involved.

### Verification improvements

* Add architecture tests for Phase 14 authority boundaries.
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

* Update doctrine maps for Phase 14 authorities.
* Mark implementation-backed guarantees separately from planned future work.
* Update diagrams or tables only when they match implementation.
* Record intentionally excluded capabilities to prevent scope creep.

### Exit criteria

* No known Phase 14 authority conflict remains unresolved.
* Deterministic artifacts have explicit identity and ordering rules.
* Every new subsystem has a verification strategy.
* Documentation, tests, and contracts agree on authority boundaries.
* Phase 14.C can audit implementation without relying on aspiration.

## Phase 14.C — Architecture Certification and Architectural Tests

### Purpose

Certify that Phase 14 is architecturally correct before Phase 15 begins. This milestone exists solely to prove correctness, not to add features.

### Architecture audits

* Audit every Phase 14 subsystem against its declared authority.
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

* Run deterministic fixture scenarios for all Phase 14 outputs.
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

* Inspect source paths changed during Phase 14.
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

### Promotion criteria for Phase 15

Phase 15 may begin only when Phase 14.C certifies that Phase 14 artifacts are stable, deterministic where required, authority-safe, and regression-protected.
