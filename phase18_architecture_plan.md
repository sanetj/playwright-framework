# Phase 18 Architecture Plan — Extensible Browser Security Intelligence Platform

## Phase Overview

### Vision

Expose controlled extension and operational surfaces for evidence sources, replay strategies, analyzers, planners, exporters, benchmarks, and bug bounty workflows without weakening replay/evidence authority.

### Architectural objective

Turn the hardened and empirically evaluated architecture into a durable platform optimized for expert researcher leverage and high-ROI vulnerability investigation.

### Why this phase exists

After Phases 13–17, authority boundaries and evidence quality are strong enough to support extensibility and operational use without collapsing into a generic plugin-driven scanner.

### Relationship to previous phases

It depends on deterministic truth, proof quality, planning, knowledge, and research baselines.

### Relationship to subsequent phases

It is the target endpoint of this roadmap and should feed future product/research lines only after certification.

### Non-negotiable doctrines

* Replay remains canonical truth.
* Evidence remains canonical truth.
* The Investigation Pipeline owns orchestration.
* Bundle projection owns representation only.
* Derived intelligence never mutates canonical truth.
* Deterministic derived intelligence is preferred over heuristic convenience.
* AI, if introduced downstream in later work, remains advisory and never authoritative.

## Phase 18.1 — Platform Authority Manifest

### Purpose

Define the public authority manifest for every extension surface and operational subsystem.

### Problem Statement

Extensibility without authority metadata causes boundary erosion.

### Architectural Motivation

A platform must tell extensions what they may consume, produce, and never mutate.

### Capabilities Introduced

Authority manifest schema; extension authority classes; determinism classes; dependency declarations; certification requirements.

### Capabilities Explicitly Excluded

No arbitrary plugin execution; no ungoverned extension loading.

### New Subsystems

Platform Authority Manifest; Extension Classifier.

### Subsystem Changes

All future extension surfaces derive from manifest authority.

### Contracts Introduced

ExtensionAuthority; DeterminismClass; DependencyDeclaration.

### Authority Changes

Manifest governs extension permissions, not runtime truth.

### Pipeline Changes

Pipeline accepts only outputs from authorized extension classes.

### Determinism Requirements

Manifest evaluation deterministic.

### Repository Doctrines Affected

Authority > convenience.

### Dependencies

Phase 17 research baseline.

### Risks

Manifest too rigid could slow innovation; allow versioned evolution.

### Verification Strategy

Manifest validation tests.

### Success Criteria

Extension authority is explicit before APIs.

### Readiness Criteria for 18.2

18.2 begins when manifest is stable.

## Phase 18.2 — Evidence Source Adapter Architecture

### Purpose

Define safe extension points for HAR, proxy, CDP, fixture, and Playwright evidence sources that produce canonical evidence without conclusions.

### Problem Statement

The platform should not remain Playwright-only, but new sources must not bypass evidence doctrine.

### Architectural Motivation

More evidence sources increase utility while canonical evidence preserves truth.

### Capabilities Introduced

Adapter contract; source capability declarations; normalization responsibilities; source trust labels; fixture-source mode.

### Capabilities Explicitly Excluded

No adapter-created findings; no source-specific conclusion logic.

### New Subsystems

Evidence Source Adapter Interface; Source Trust Evaluator.

### Subsystem Changes

Canonical evidence layer accepts adapter output after normalization.

### Contracts Introduced

EvidenceSourceAdapter; SourceCapability; SourceTrustLabel.

### Authority Changes

Adapters capture/normalize evidence only.

### Pipeline Changes

Pipeline can use adapter-provided canonical evidence as input.

### Determinism Requirements

Adapter output deterministic for same source artifact.

### Repository Doctrines Affected

Evidence > conclusions; Replay remains canonical.

### Dependencies

18.1 authority manifest.

### Risks

Source heterogeneity; require strict canonicalization.

### Verification Strategy

Adapter conformance suites.

### Success Criteria

Multiple evidence sources preserve canonical evidence semantics.

### Readiness Criteria for 18.3

18.3 begins when adapter rules are certified.

## Phase 18.3 — Replay Strategy Extension Architecture

### Purpose

Define governed extension points for replay strategies and proof controls.

### Problem Statement

New vulnerability patterns require new replay strategies, but strategy plugins can easily bypass validation authority.

### Architectural Motivation

Replay extensibility should increase coverage while preserving proof rules.

### Capabilities Introduced

Strategy extension contract; control requirements; risk metadata; validation-result compatibility; strategy test packs.

### Capabilities Explicitly Excluded

No strategy-owned conclusions; no unsafe mutation by default.

### New Subsystems

Replay Strategy Extension Host; Strategy Conformance Tester.

### Subsystem Changes

Validation authority executes strategy outputs through existing result algebra.

### Contracts Introduced

ReplayStrategyExtension; StrategyConformanceReport.

### Authority Changes

Strategies propose attempts; validation concludes.

### Pipeline Changes

Validation pipeline consumes certified strategies.

### Determinism Requirements

Strategy ordering deterministic by manifest and eligibility.

### Repository Doctrines Affected

Replay > inference; Proof > probability.

### Dependencies

18.2 evidence adapters.

### Risks

Unsafe strategies; require policy and test certification.

### Verification Strategy

Strategy extension fixtures with negative controls.

### Success Criteria

New replay strategies can be added safely.

### Readiness Criteria for 18.4

18.4 begins when strategy extension safety is proven.

## Phase 18.4 — Analyzer and Rule-Pack Extension Architecture

### Purpose

Define extension points for candidate scoring, graph edges, consistency, novelty, sufficiency, and explanation-plan rules.

### Problem Statement

Research and product needs will require new analyzers, but analyzers must remain derived intelligence.

### Architectural Motivation

Rule-pack extensibility compounds strengths of pure deterministic analyzers.

### Capabilities Introduced

Rule-pack schema; analyzer input/output contracts; deterministic ordering; evidence-reference requirements; conflict handling.

### Capabilities Explicitly Excluded

No analyzer mutation of canonical evidence; no analyzer validation conclusions.

### New Subsystems

Analyzer Rule-Pack Host; Rule Conflict Resolver.

### Subsystem Changes

Analyzers consume snapshots/validated results and emit derived artifacts.

### Contracts Introduced

AnalyzerRulePack; RuleOutput; RuleConflict.

### Authority Changes

Analyzers own derived observations only.

### Pipeline Changes

Pipeline may run certified rule packs at existing analyzer stages.

### Determinism Requirements

Rule execution order deterministic and declared.

### Repository Doctrines Affected

Derived intelligence never mutates truth.

### Dependencies

18.3 replay strategy extensions.

### Risks

Rule explosion/noise; require sufficiency and relevance constraints.

### Verification Strategy

Rule-pack conformance and conflict tests.

### Success Criteria

Analyzer ecosystem grows without authority leakage.

### Readiness Criteria for 18.5

18.5 begins when rule-pack governance is stable.

## Phase 18.5 — Bug Bounty Workflow Integration

### Purpose

Define operational workflows for researcher queues, triage packages, submission readiness, duplicate avoidance, and ROI dashboards.

### Problem Statement

The platform objective is high-ROI bug bounty productivity, not autonomous exploitation.

### Architectural Motivation

Operational workflow should reduce researcher effort while keeping experts in control.

### Capabilities Introduced

Researcher queue; triage package workflow; duplicate warning; readiness scoring; ROI dashboard concepts.

### Capabilities Explicitly Excluded

No automatic target exploitation; no automatic submission; no payout guarantees.

### New Subsystems

Researcher Workbench Model; Submission Readiness Evaluator.

### Subsystem Changes

Uses bundles, proof packages, planning, and knowledge outputs.

### Contracts Introduced

ResearcherQueueItem; SubmissionReadiness; DuplicateWarning.

### Authority Changes

Workflow owns operational presentation, not security truth.

### Pipeline Changes

Pipeline outputs feed queues; execution remains controlled.

### Determinism Requirements

Queue ordering deterministic from ROI/schedule policy.

### Repository Doctrines Affected

Maximize researcher leverage; minimize duplicate work.

### Dependencies

18.4 analyzer extensions.

### Risks

Workflow pressure could bias validation; keep readiness separate from truth.

### Verification Strategy

Workflow scenario tests and human review criteria.

### Success Criteria

Researchers can act faster with less noise.

### Readiness Criteria for 18.6

18.6 begins when workflows respect authority boundaries.

## Phase 18.6 — Operational Safety and Policy Architecture

### Purpose

Define safety, authorization, audit, and policy layers for real-world usage.

### Problem Statement

A high-ROI platform can cause harm if operational controls are weak.

### Architectural Motivation

Safety architecture enables responsible use and preserves trust.

### Capabilities Introduced

Policy profiles; mutation approvals; target authorization records; audit trails; rate/budget controls; sensitive data handling.

### Capabilities Explicitly Excluded

No stealth features; no bypassing target policy; no destructive defaults.

### New Subsystems

Operational Policy Gate; Authorization Audit Ledger.

### Subsystem Changes

Runtime and planner must consult policy gates before action execution.

### Contracts Introduced

TargetAuthorization; PolicyDecision; OperationalAuditRecord.

### Authority Changes

Policy gates authorize action, not truth.

### Pipeline Changes

Pipeline/runtime execution is gated by policy decisions.

### Determinism Requirements

Policy evaluation deterministic for same policy/action.

### Repository Doctrines Affected

Architecture > shortcuts; Authority > convenience.

### Dependencies

18.5 workflows.

### Risks

Policy complexity; default to safe conservative behavior.

### Verification Strategy

Policy denial/approval tests and audit checks.

### Success Criteria

Real-world use is controlled and auditable.

### Readiness Criteria for 18.7

18.7 begins when policy controls are complete.

## Phase 18.7 — Platform Baseline and Versioned Public Contracts

### Purpose

Stabilize versioned public contracts, deprecation rules, compatibility policy, and platform baseline artifacts.

### Problem Statement

A platform cannot evolve if public contracts are accidental or unstable.

### Architectural Motivation

Versioned contracts protect downstream users and future research artifacts.

### Capabilities Introduced

Public DTO list; schema versioning; compatibility rules; deprecation process; baseline artifact set.

### Capabilities Explicitly Excluded

No unstable experimental APIs as stable; no unversioned schema changes.

### New Subsystems

Contract Version Registry; Compatibility Validator.

### Subsystem Changes

All extension and export surfaces reference versioned contracts.

### Contracts Introduced

VersionedContract; CompatibilityReport; DeprecationNotice.

### Authority Changes

Contract registry governs public compatibility, not runtime truth.

### Pipeline Changes

Pipeline emits versioned artifact schemas.

### Determinism Requirements

Version resolution deterministic.

### Repository Doctrines Affected

Architecture > implementation shortcuts.

### Dependencies

18.6 operational policy.

### Risks

Prematurely freezing weak contracts; include experimental namespace.

### Verification Strategy

Compatibility tests over fixture artifacts.

### Success Criteria

Phase 18 platform baseline is versioned and operable.

### Readiness Criteria for 18.H

18.H begins when public contract set is complete.

## Phase 18.H — Architecture Hardening

### Purpose

Stabilize Phase 18 after its seven feature milestones and remove drift before certification. This milestone is not a feature phase and must not introduce new capability surface.

### Architecture improvements

* Re-check that Phase 18 additions preserve the Phase 12 Investigation Pipeline as orchestration authority.
* Remove duplicate concepts introduced during planning.
* Collapse terminology that overlaps with earlier phases.
* Ensure each new subsystem has one explicit authority and one forbidden-responsibility list.
* Verify every derived artifact references canonical evidence, replay outcomes, or prior derived artifacts explicitly.

### Determinism improvements

* Verify deterministic ordering for all Phase 18 outputs.
* Require stable identity material for every new artifact.
* Separate fixture-mode determinism from live-mode observed variance.
* Ensure time, environment, and policy inputs are explicit.

### Boundary improvements

* Confirm that derived intelligence never mutates canonical evidence.
* Confirm that bundle/export/projector layers remain representation-only.
* Confirm that planning, knowledge, research, or platform surfaces do not create validation conclusions.
* Confirm that runtime adapters and policy gates do not score or interpret vulnerabilities.

### Lifecycle improvements

* Verify lifecycle states for all Phase 18 artifacts.
* Define creation, consumption, finalization, and archival boundaries.
* Ensure failure and partial-completion states are explicit.
* Ensure cleanup obligations are represented where runtime resources are involved.

### Verification improvements

* Add architecture tests for Phase 18 authority boundaries.
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

* Update doctrine maps for Phase 18 authorities.
* Mark implementation-backed guarantees separately from planned future work.
* Update diagrams or tables only when they match implementation.
* Record intentionally excluded capabilities to prevent scope creep.

### Exit criteria

* No known Phase 18 authority conflict remains unresolved.
* Deterministic artifacts have explicit identity and ordering rules.
* Every new subsystem has a verification strategy.
* Documentation, tests, and contracts agree on authority boundaries.
* Phase 18.C can audit implementation without relying on aspiration.

## Phase 18.C — Architecture Certification and Architectural Tests

### Purpose

Certify that Phase 18 is architecturally correct before Phase post-18 evolution begins. This milestone exists solely to prove correctness, not to add features.

### Architecture audits

* Audit every Phase 18 subsystem against its declared authority.
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

* Run deterministic fixture scenarios for all Phase 18 outputs.
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

* Inspect source paths changed during Phase 18.
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

### Promotion criteria for Phase post-18 evolution

Phase post-18 evolution may begin only when Phase 18.C certifies that Phase 18 artifacts are stable, deterministic where required, authority-safe, and regression-protected.
