# Phase 13 Architecture Plan — Deterministic Replay Quality and Evidence Hardening

## Phase Overview

### Vision

Harden the completed Phase 12 investigation pipeline without redesigning it, making replay quality, evidence quality, and derived-output determinism strong enough to support higher-order planning and ROI optimization.

### Architectural objective

Preserve Phase 12 orchestration while strengthening deterministic evidence intake, replay result integrity, validation authority, investigation context immutability, and bundle reproducibility.

### Why this phase exists

Phase 12 is stable and feature-complete enough to extend, but future phases cannot safely add planning, memory, or research infrastructure unless replay and evidence artifacts are reliable, repeatable, and boundary-safe.

### Relationship to previous phases

It depends on the existing Investigation Pipeline, Investigation Context, replay validation pipeline, candidate synthesis, prioritization, attack graph, consistency, novelty, sufficiency, explanation planning, and canonical bundle projection.

### Relationship to subsequent phases

It provides the reliable truth substrate required by Phase 14 proof optimization and false-positive suppression.

### Non-negotiable doctrines

* Replay remains canonical truth.
* Evidence remains canonical truth.
* The Investigation Pipeline owns orchestration.
* Bundle projection owns representation only.
* Derived intelligence never mutates canonical truth.
* Deterministic derived intelligence is preferred over heuristic convenience.
* AI, if introduced downstream in later work, remains advisory and never authoritative.

## Phase 13.1 — Replay Quality Baseline and Evidence Invariant Inventory

### Purpose

Inventory the replay/evidence quality guarantees already present in Phase 12 and define the exact invariant set that future work must preserve.

### Problem Statement

Current subsystems contain strong local deterministic behavior, but their guarantees are distributed across runtime evidence capture, validation, context, analyzers, and bundle projection.

### Architectural Motivation

Before modifying architecture, the platform needs an explicit, implementation-grounded map of replay-quality invariants so hardening improves the existing baseline rather than redesigning it.

### Capabilities Introduced

Replay quality taxonomy; evidence quality dimensions; invariant map for canonical exchanges, proof lineage, validated findings, context references, and bundle projection; non-goals register.

### Capabilities Explicitly Excluded

No new replay engine; no planner; no persistent memory; no AI interpretation; no replacement of InvestigationPipeline.

### New Subsystems

Replay Quality Inventory; Evidence Invariant Catalogue.

### Subsystem Changes

Investigation Context gains a documented role as invariant carrier, not truth owner; Validation authority remains canonical for conclusions.

### Contracts Introduced

ReplayQualityInvariant; EvidenceQualityDimension; InvariantViolationClass.

### Authority Changes

No authority transfer; this milestone documents and constrains existing authority.

### Pipeline Changes

No stage reordering; pipeline remains Phase 12 shape.

### Determinism Requirements

All invariants must define deterministic inputs, outputs, and tolerated runtime variance.

### Repository Doctrines Affected

Replay > inference; Evidence > conclusions; Bundle owns representation only.

### Dependencies

Phase 12 implementation and existing test inventory.

### Risks

Risk of documenting aspirational guarantees not actually implemented; mitigate by marking each invariant as observed, required, or future.

### Verification Strategy

Architecture review checklist plus static inventory tests that confirm referenced subsystems exist.

### Success Criteria

Complete invariant matrix accepted as the Phase 13 baseline.

### Readiness Criteria for 13.2

13.2 may begin when invariant categories and non-goals are stable.

## Phase 13.2 — Canonical Evidence Normalization Strategy

### Purpose

Define canonical normalization rules for requests, responses, headers, bodies, identities, timestamps, and environment observations used by replay-backed investigations.

### Problem Statement

Evidence quality is weakened when semantically identical exchanges differ due to header order, timestamp formatting, body fingerprint placeholders, or runtime-specific metadata.

### Architectural Motivation

Replay is only as authoritative as its canonical evidence substrate. Normalization must harden evidence without changing Phase 12 analytical authority.

### Capabilities Introduced

Canonicalization policy; stable header ordering; body fingerprint requirements; environment-observation classification; observed-time vs generated-time distinction.

### Capabilities Explicitly Excluded

No implementation of a new evidence store; no database; no mutation of captured truth after canonicalization; no scanner behavior.

### New Subsystems

Canonical Evidence Normalization Policy; Runtime Observation Classifier.

### Subsystem Changes

Evidence capture subsystem gains stricter normalization obligations; bundle projection consumes normalized evidence only.

### Contracts Introduced

CanonicalRequestShape; CanonicalResponseShape; EvidenceTimestampClass; BodyFingerprintContract.

### Authority Changes

Evidence remains authority; normalizers cannot create conclusions.

### Pipeline Changes

Pipeline inserts no new intelligence stage; normalization is part of evidence intake/projection boundaries.

### Determinism Requirements

Same evidence input must normalize to the same canonical representation under fixture conditions.

### Repository Doctrines Affected

Evidence > conclusions; Determinism > heuristics.

### Dependencies

13.1 invariant inventory.

### Risks

Over-normalization could erase useful runtime evidence; policy must preserve raw-observed references.

### Verification Strategy

Golden canonicalization fixtures and differential normalization tests.

### Success Criteria

Canonical evidence policy supports reproducible replay and bundle comparisons.

### Readiness Criteria for 13.3

13.3 may begin once normalization contracts are unambiguous.

## Phase 13.3 — Validation Result Integrity Model

### Purpose

Specify a closed validation-result model that represents supported, rejected, inconclusive, invalid replay, and insufficient evidence outcomes without manufacturing proof-backed findings.

### Problem Statement

Phase 12 validation has proof-backed support paths, but unsupported outcomes need equally explicit structure so downstream intelligence cannot confuse partial validation objects with replay truth.

### Architectural Motivation

Validation is the authority for conclusions. Its result language must make invalid conclusions unrepresentable, not merely discouraged.

### Capabilities Introduced

Validation result taxonomy; proof-bearing vs non-proof-bearing variants; failure reason catalogue; replay-attempt lineage requirements; downstream consumption rules.

### Capabilities Explicitly Excluded

No new exploit classes; no replay strategy expansion; no confidence learning; no AI judgment.

### New Subsystems

Validation Result Algebra; Replay Attempt Lineage Record.

### Subsystem Changes

Candidate synthesis consumes validation outcomes according to variant eligibility; sufficiency can reason about incomplete validation explicitly.

### Contracts Introduced

ValidationResult; SupportedFinding; RejectedFinding; InconclusiveValidation; InvalidReplayResult; InsufficientEvidenceResult.

### Authority Changes

Validation authority strengthened; orchestration may route results but not coerce them.

### Pipeline Changes

Pipeline preserves validation stage location but changes what it passes downstream.

### Determinism Requirements

Variant identity and ordering must be deterministic for identical replay outcomes.

### Repository Doctrines Affected

Validation never manufactures evidence; Proof > probability.

### Dependencies

13.2 canonical evidence contracts.

### Risks

Migration risk for existing bundle consumers expecting a single validated-finding shape.

### Verification Strategy

Variant completeness tests and negative tests for malformed proof-bearing results.

### Success Criteria

No validation consumer can treat unsupported outcomes as supported findings.

### Readiness Criteria for 13.4

13.4 may begin once validation variants and downstream eligibility are defined.

## Phase 13.4 — Investigation Context Snapshot Discipline

### Purpose

Define immutable investigation snapshots that preserve Phase 12 context semantics while making completed state safe for bundle projection, tests, and future planning.

### Problem Statement

The active context is useful during orchestration, but completed investigations need immutable snapshots so derived systems cannot mutate evidence references or analysis arrays.

### Architectural Motivation

Future planning and memory will depend on stable investigation states. Snapshot discipline hardens without replacing the Phase 12 context.

### Capabilities Introduced

Active-vs-completed context distinction; snapshot content contract; mutation boundary; status transition invariants; snapshot provenance.

### Capabilities Explicitly Excluded

No persistent memory; no knowledge graph; no planner; no replacement of active lifecycle.

### New Subsystems

Investigation Snapshot Contract; Lifecycle Transition Ledger.

### Subsystem Changes

Bundle projection should consume completed snapshots where possible; analyzers continue to populate context through existing lifecycle.

### Contracts Introduced

InvestigationSnapshot; ContextTransitionRecord; SnapshotProvenance.

### Authority Changes

Context remains orchestration state owner; snapshot becomes immutable representation of derived state, not evidence authority.

### Pipeline Changes

Pipeline adds snapshot finalization before bundle projection, conceptually, without changing analytic stage order.

### Determinism Requirements

Snapshot content and ordering must be byte-stable under deterministic inputs.

### Repository Doctrines Affected

Investigation consumes truth but does not own it.

### Dependencies

13.3 validation result integrity.

### Risks

Snapshot may duplicate too much if not reference-oriented; avoid copying raw evidence bodies unnecessarily.

### Verification Strategy

Mutation-after-completion tests; snapshot equality tests.

### Success Criteria

Completed investigation state is immutable and suitable for Phase 14 validation analysis.

### Readiness Criteria for 13.5

13.5 may begin once snapshot boundaries are accepted.

## Phase 13.5 — Bundle Reproducibility and Representation Discipline

### Purpose

Specify reproducible bundle projection rules that preserve bundle authority as representation only and prevent bundle metadata from weakening determinism.

### Problem Statement

Bundle output is the principal artifact for researchers and downstream AI, so non-reproducible projection or representational leakage undermines triage and research value.

### Architectural Motivation

The bundle must package proof, evidence references, and derived intelligence without creating intelligence or injecting nondeterministic presentation artifacts.

### Capabilities Introduced

Bundle reproducibility policy; deterministic generated metadata classification; redaction-lineage preservation; schema-stability expectations; bundle completeness checks.

### Capabilities Explicitly Excluded

No narrative generation; no AI reasoning; no new scoring; no evidence mutation.

### New Subsystems

Bundle Reproducibility Gate; Representation Completeness Checker.

### Subsystem Changes

Bundle projection consumes snapshots and canonical evidence; redaction must preserve traceability.

### Contracts Introduced

BundleProjectionContract; RepresentationOnlyInvariant; BundleCompletenessReport.

### Authority Changes

Bundle authority clarified: representation only, never conclusion authority.

### Pipeline Changes

No new pipeline intelligence stage; projection stage gains stricter exit requirements.

### Determinism Requirements

Byte-identical bundles under fixture mode; live-mode variance must be labeled.

### Repository Doctrines Affected

Bundle owns representation only; Evidence > conclusions.

### Dependencies

13.4 snapshots.

### Risks

Overly strict determinism could hide legitimate live-environment variance; variance labels are required.

### Verification Strategy

Golden bundle tests and orphan-reference tests.

### Success Criteria

Bundle artifacts are reproducible and triage-safe.

### Readiness Criteria for 13.6

13.6 may begin once bundle projection rules are certified.

## Phase 13.6 — Executable Architecture Governance Baseline

### Purpose

Convert Phase 12/13 doctrine into enforceable architecture checks for dependency direction, authority boundaries, and deterministic artifact rules.

### Problem Statement

Documentation alone cannot prevent future phases from importing concrete infrastructure into derived intelligence or creating parallel authorities.

### Architectural Motivation

Future ROI features will add pressure for shortcuts. Governance must catch boundary erosion early.

### Capabilities Introduced

Authority manifest semantics; allowed dependency matrix; forbidden import classes; doctrine-to-test mapping; architectural regression checklist.

### Capabilities Explicitly Excluded

No plugin system; no public extension API; no runtime policy engine redesign.

### New Subsystems

Architecture Governance Gate; Boundary Rule Catalogue.

### Subsystem Changes

All subsystems receive explicit authority classification.

### Contracts Introduced

AuthorityRule; DependencyBoundaryRule; DoctrineComplianceCheck.

### Authority Changes

Architecture governance becomes an enforcement authority for repository structure, not runtime truth.

### Pipeline Changes

Pipeline remains owner of orchestration, but governance prevents unauthorized ownership expansion.

### Determinism Requirements

Governance checks must be deterministic and not depend on file traversal order.

### Repository Doctrines Affected

Authority > convenience; Architecture > implementation shortcuts.

### Dependencies

13.5 bundle discipline.

### Risks

Rules may be too broad and block legitimate evolution; rules need explicit exceptions.

### Verification Strategy

Static architecture tests and audit reports.

### Success Criteria

Boundary violations become visible before Phase 14 begins.

### Readiness Criteria for 13.7

13.7 may begin once governance rules are runnable and reviewed.

## Phase 13.7 — Phase 13 Integrated Replay-Quality Baseline

### Purpose

Integrate the Phase 13 contracts into a single baseline definition for replay quality, evidence quality, validation integrity, context snapshots, bundle reproducibility, and governance.

### Problem Statement

Individual hardening contracts are insufficient unless they compose into a coherent baseline used by every subsequent phase.

### Architectural Motivation

Phase 14 must inherit one stable truth substrate, not a pile of independent policies.

### Capabilities Introduced

Integrated Phase 13 baseline; quality scorecard; readiness gate for Phase 14; known-residual-risk register.

### Capabilities Explicitly Excluded

No new feature work; no expansion of analyzers; no memory; no planning.

### New Subsystems

Phase 13 Baseline Scorecard; Residual Risk Register.

### Subsystem Changes

Subsystem changes are limited to accepted hardening boundaries.

### Contracts Introduced

Phase13Baseline; ResidualRiskItem; PromotionReadinessRecord.

### Authority Changes

No new authority; this milestone consolidates authority boundaries.

### Pipeline Changes

Pipeline unchanged except for hardening gates.

### Determinism Requirements

Baseline must define reproducibility expectations for fixture and live modes separately.

### Repository Doctrines Affected

Determinism > heuristics; Replay > inference.

### Dependencies

13.1 through 13.6.

### Risks

Risk of declaring success without tests; certification milestone must remain separate.

### Verification Strategy

End-to-end baseline walkthrough using existing investigation flow.

### Success Criteria

Phase 13 baseline is coherent and ready for hardening/certification.

### Readiness Criteria for 13.H

13.H may begin after residual risks are documented.

## Phase 13.H — Architecture Hardening

### Purpose

Stabilize Phase 13 after its seven feature milestones and remove drift before certification. This milestone is not a feature phase and must not introduce new capability surface.

### Architecture improvements

* Re-check that Phase 13 additions preserve the Phase 12 Investigation Pipeline as orchestration authority.
* Remove duplicate concepts introduced during planning.
* Collapse terminology that overlaps with earlier phases.
* Ensure each new subsystem has one explicit authority and one forbidden-responsibility list.
* Verify every derived artifact references canonical evidence, replay outcomes, or prior derived artifacts explicitly.

### Determinism improvements

* Verify deterministic ordering for all Phase 13 outputs.
* Require stable identity material for every new artifact.
* Separate fixture-mode determinism from live-mode observed variance.
* Ensure time, environment, and policy inputs are explicit.

### Boundary improvements

* Confirm that derived intelligence never mutates canonical evidence.
* Confirm that bundle/export/projector layers remain representation-only.
* Confirm that planning, knowledge, research, or platform surfaces do not create validation conclusions.
* Confirm that runtime adapters and policy gates do not score or interpret vulnerabilities.

### Lifecycle improvements

* Verify lifecycle states for all Phase 13 artifacts.
* Define creation, consumption, finalization, and archival boundaries.
* Ensure failure and partial-completion states are explicit.
* Ensure cleanup obligations are represented where runtime resources are involved.

### Verification improvements

* Add architecture tests for Phase 13 authority boundaries.
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

* Update doctrine maps for Phase 13 authorities.
* Mark implementation-backed guarantees separately from planned future work.
* Update diagrams or tables only when they match implementation.
* Record intentionally excluded capabilities to prevent scope creep.

### Exit criteria

* No known Phase 13 authority conflict remains unresolved.
* Deterministic artifacts have explicit identity and ordering rules.
* Every new subsystem has a verification strategy.
* Documentation, tests, and contracts agree on authority boundaries.
* Phase 13.C can audit implementation without relying on aspiration.

## Phase 13.C — Architecture Certification and Architectural Tests

### Purpose

Certify that Phase 13 is architecturally correct before Phase 14 begins. This milestone exists solely to prove correctness, not to add features.

### Architecture audits

* Audit every Phase 13 subsystem against its declared authority.
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

* Run deterministic fixture scenarios for all Phase 13 outputs.
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

* Inspect source paths changed during Phase 13.
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

### Promotion criteria for Phase 14

Phase 14 may begin only when Phase 13.C certifies that Phase 13 artifacts are stable, deterministic where required, authority-safe, and regression-protected.
