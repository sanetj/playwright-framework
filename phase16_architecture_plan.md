# Phase 16 Architecture Plan — Knowledge State, Campaign Memory, and Cross-Investigation Reasoning

## Phase Overview

### Vision

Persist derived, provenance-backed knowledge across investigations without ever allowing memory to replace replay or evidence authority.

### Architectural objective

Introduce knowledge state, campaign memory, drift handling, cross-investigation correlation, and pattern learning for researcher leverage.

### Why this phase exists

Bug bounty ROI improves when researchers do not rediscover the same facts repeatedly and can identify recurring high-value patterns across targets or sessions.

### Relationship to previous phases

It depends on Phase 15 investigation state, negative knowledge, planning outcomes, and iteration records.

### Relationship to subsequent phases

It supplies durable data for Phase 17 empirical evaluation, benchmarks, and ROI measurement.

### Non-negotiable doctrines

* Replay remains canonical truth.
* Evidence remains canonical truth.
* The Investigation Pipeline owns orchestration.
* Bundle projection owns representation only.
* Derived intelligence never mutates canonical truth.
* Deterministic derived intelligence is preferred over heuristic convenience.
* AI, if introduced downstream in later work, remains advisory and never authoritative.

## Phase 16.1 — Knowledge State Boundary

### Purpose

Define the boundary between canonical evidence, investigation state, and derived knowledge state.

### Problem Statement

Persistent memory is dangerous if it becomes a second truth source.

### Architectural Motivation

Knowledge should accelerate research but remain revocable, versioned, and evidence-linked.

### Capabilities Introduced

Knowledge authority model; derivation rules; provenance requirements; revocation semantics.

### Capabilities Explicitly Excluded

No automatic truth promotion; no global mutable evidence store; no AI memory.

### New Subsystems

Knowledge State Authority; Provenance Resolver.

### Subsystem Changes

Investigation outputs can be promoted to knowledge records only with lineage.

### Contracts Introduced

KnowledgeRecord; KnowledgeProvenance; RevocationReason.

### Authority Changes

Knowledge authority stores derived claims, never canonical truth.

### Pipeline Changes

Pipeline may publish completed investigation summaries to knowledge ingestion boundary.

### Determinism Requirements

Knowledge identity deterministic from source investigation/proof lineage.

### Repository Doctrines Affected

Replay remains canonical truth.

### Dependencies

Phase 15 planning baseline.

### Risks

Memory may override evidence culturally; enforce doctrine in contracts.

### Verification Strategy

Boundary tests for knowledge vs evidence APIs.

### Success Criteria

Knowledge has a safe authority boundary.

### Readiness Criteria for 16.2

16.2 begins when boundary is accepted.

## Phase 16.2 — Campaign Memory Model

### Purpose

Define campaign-level memory for targets, roles, resource families, ownership boundaries, negative knowledge, and proof patterns.

### Problem Statement

Single investigations miss campaign context and repeated opportunity patterns.

### Architectural Motivation

Campaign memory increases researcher leverage while preserving investigation-level proof requirements.

### Capabilities Introduced

Campaign entities; target/session grouping; resource-family memory; role memory; negative memory carry-forward; proof pattern index.

### Capabilities Explicitly Excluded

No cross-target unsupported claims; no vulnerability assertion without proof.

### New Subsystems

Campaign Memory Store; Campaign Entity Resolver.

### Subsystem Changes

Knowledge state receives campaign projections from investigations.

### Contracts Introduced

CampaignMemoryRecord; CampaignEntity; CampaignScope.

### Authority Changes

Campaign memory advises planning, not validation truth.

### Pipeline Changes

Pipeline can read campaign advisories before planning but must validate anew.

### Determinism Requirements

Campaign memory ordering and lookup deterministic.

### Repository Doctrines Affected

Evidence > conclusions; Derived intelligence never mutates truth.

### Dependencies

16.1 knowledge boundary.

### Risks

Entity correlation errors; require confidence and provenance.

### Verification Strategy

Campaign fixture tests with repeated resource patterns.

### Success Criteria

Researchers avoid duplicate work within campaigns.

### Readiness Criteria for 16.3

16.3 begins when campaign scope is precise.

## Phase 16.3 — Cross-Investigation Correlation

### Purpose

Define deterministic correlation across investigations by resource family, authorization vector, ownership relationship, proof type, and environment fingerprint.

### Problem Statement

High-value patterns often appear across workflows and sessions, but naive correlation creates false confidence.

### Architectural Motivation

Correlation should identify opportunities and duplicates without claiming vulnerability.

### Capabilities Introduced

Correlation keys; duplicate candidate detection; pattern recurrence; environment compatibility; confidence dimensions.

### Capabilities Explicitly Excluded

No automatic validation; no cross-investigation proof merging into a new finding.

### New Subsystems

Correlation Engine; Duplicate Opportunity Detector.

### Subsystem Changes

Prioritization/planning can consume correlation signals.

### Contracts Introduced

CorrelationSignal; DuplicateInvestigationCandidate; EnvironmentCompatibility.

### Authority Changes

Correlation owns pattern detection, not conclusions.

### Pipeline Changes

Pipeline may enrich candidates/plans with correlation hints.

### Determinism Requirements

Correlation results deterministic from sorted knowledge records.

### Repository Doctrines Affected

Determinism > heuristics; Proof > probability.

### Dependencies

16.2 campaign memory.

### Risks

False correlation due to unstable URLs or identities; require canonical keys.

### Verification Strategy

Golden correlation datasets.

### Success Criteria

Recurring high-value patterns surface without becoming unsupported findings.

### Readiness Criteria for 16.4

16.4 begins when correlation precision is acceptable.

## Phase 16.4 — Drift and Staleness Model

### Purpose

Define how knowledge decays, expires, or becomes environment-specific as applications change.

### Problem Statement

Persistent knowledge can become harmful when targets evolve.

### Architectural Motivation

ROI requires reusing useful memory while not trusting stale evidence.

### Capabilities Introduced

Drift dimensions; staleness clocks; environment fingerprint comparison; revalidation triggers; confidence decay.

### Capabilities Explicitly Excluded

No automatic deletion of canonical history; no stale proof reuse as current proof.

### New Subsystems

Knowledge Drift Evaluator; Revalidation Trigger Planner.

### Subsystem Changes

Planning consumes drift status to decide revalidation.

### Contracts Introduced

DriftSignal; StalenessStatus; RevalidationNeed.

### Authority Changes

Drift model changes knowledge confidence, not historical truth.

### Pipeline Changes

Pipeline can mark prior knowledge as requiring revalidation.

### Determinism Requirements

Drift evaluation deterministic for same timestamps/fingerprints.

### Repository Doctrines Affected

Evidence > conclusions; Replay > inference.

### Dependencies

16.3 correlation.

### Risks

Time-based decay can be arbitrary; tie to environment and observation changes.

### Verification Strategy

Drift scenario tests.

### Success Criteria

Stale knowledge cannot silently guide high-confidence decisions.

### Readiness Criteria for 16.5

16.5 begins when revalidation triggers are clear.

## Phase 16.5 — High-ROI Pattern Library

### Purpose

Define a curated derived library of evidence-backed patterns that historically indicate valuable authorization vulnerabilities.

### Problem Statement

Researchers benefit from recognizing recurring high-value structures.

### Architectural Motivation

Pattern libraries increase leverage if grounded in proof and separated from truth.

### Capabilities Introduced

Pattern schema; pattern evidence requirements; ROI attributes; applicability constraints; false-positive history.

### Capabilities Explicitly Excluded

No universal vulnerability claims; no opaque ML ranking.

### New Subsystems

Pattern Library; Pattern Applicability Evaluator.

### Subsystem Changes

Candidate prioritization/planning may consume pattern matches.

### Contracts Introduced

SecurityPattern; PatternMatch; PatternRoiPrior.

### Authority Changes

Pattern library suggests, validation proves.

### Pipeline Changes

Pipeline enriches planning/candidates with pattern signals.

### Determinism Requirements

Pattern matching deterministic from canonical features.

### Repository Doctrines Affected

Inference never outranks replay.

### Dependencies

16.4 drift model.

### Risks

Pattern overfitting to past bounties; require false-positive tracking.

### Verification Strategy

Pattern corpus tests and ablations.

### Success Criteria

Known high-ROI structures improve prioritization transparently.

### Readiness Criteria for 16.6

16.6 begins when pattern governance is defined.

## Phase 16.6 — Knowledge-Aware Planning

### Purpose

Define how Phase 15 planner consumes knowledge, campaign memory, drift, correlation, and patterns without allowing memory to bypass replay.

### Problem Statement

Planning can benefit from memory, but memory must remain advisory.

### Architectural Motivation

The platform should recommend better next actions based on prior evidence while still requiring current replay proof.

### Capabilities Introduced

Knowledge-to-plan signal mapping; advisory ranking; revalidation-first policy; duplicate avoidance; campaign-level stop criteria.

### Capabilities Explicitly Excluded

No automatic proof reuse; no persistent AI agent.

### New Subsystems

Knowledge-Aware Planner Adapter; Revalidation Policy Gate.

### Subsystem Changes

Planner receives knowledge advisories as derived signals.

### Contracts Introduced

KnowledgePlanningSignal; RevalidationPolicy; DuplicateAvoidanceDecision.

### Authority Changes

Planning uses knowledge, validation remains proof authority.

### Pipeline Changes

Pipeline planning stage can include knowledge advisory input.

### Determinism Requirements

Same knowledge snapshot and state produce same plan.

### Repository Doctrines Affected

Planning > randomness; Replay > inference.

### Dependencies

16.5 pattern library.

### Risks

Planner may overweight memory; cap advisory influence.

### Verification Strategy

Plan comparison tests with and without knowledge.

### Success Criteria

Knowledge improves ROI without replacing validation.

### Readiness Criteria for 16.7

16.7 begins when advisory boundaries are enforced.

## Phase 16.7 — Campaign Knowledge Baseline

### Purpose

Integrate knowledge boundary, campaign memory, correlation, drift, pattern library, and knowledge-aware planning into a campaign baseline.

### Problem Statement

Knowledge features must be coherent and auditable before research evaluation.

### Architectural Motivation

Phase 17 needs stable campaign artifacts and metrics.

### Capabilities Introduced

Campaign knowledge scorecard; provenance coverage; duplicate-work reduction metrics; drift handling report.

### Capabilities Explicitly Excluded

No plugin system; no public API freeze.

### New Subsystems

Campaign Knowledge Baseline; Knowledge Quality Report.

### Subsystem Changes

Knowledge becomes a controlled derived subsystem.

### Contracts Introduced

KnowledgeQualityMetric; CampaignBaselineReport.

### Authority Changes

No new authority beyond derived knowledge.

### Pipeline Changes

Pipeline handoff to research/evaluation is defined.

### Determinism Requirements

Campaign artifacts deterministic in fixture mode.

### Repository Doctrines Affected

Researcher leverage; minimize duplicate work.

### Dependencies

16.1 through 16.6.

### Risks

Complexity risk; hardening must prune unused knowledge concepts.

### Verification Strategy

Campaign replay fixtures and provenance audits.

### Success Criteria

Knowledge subsystem ready for hardening and benchmarks.

### Readiness Criteria for 16.H

16.H begins when campaign baseline is coherent.

## Phase 16.H — Architecture Hardening

### Purpose

Stabilize Phase 16 after its seven feature milestones and remove drift before certification. This milestone is not a feature phase and must not introduce new capability surface.

### Architecture improvements

* Re-check that Phase 16 additions preserve the Phase 12 Investigation Pipeline as orchestration authority.
* Remove duplicate concepts introduced during planning.
* Collapse terminology that overlaps with earlier phases.
* Ensure each new subsystem has one explicit authority and one forbidden-responsibility list.
* Verify every derived artifact references canonical evidence, replay outcomes, or prior derived artifacts explicitly.

### Determinism improvements

* Verify deterministic ordering for all Phase 16 outputs.
* Require stable identity material for every new artifact.
* Separate fixture-mode determinism from live-mode observed variance.
* Ensure time, environment, and policy inputs are explicit.

### Boundary improvements

* Confirm that derived intelligence never mutates canonical evidence.
* Confirm that bundle/export/projector layers remain representation-only.
* Confirm that planning, knowledge, research, or platform surfaces do not create validation conclusions.
* Confirm that runtime adapters and policy gates do not score or interpret vulnerabilities.

### Lifecycle improvements

* Verify lifecycle states for all Phase 16 artifacts.
* Define creation, consumption, finalization, and archival boundaries.
* Ensure failure and partial-completion states are explicit.
* Ensure cleanup obligations are represented where runtime resources are involved.

### Verification improvements

* Add architecture tests for Phase 16 authority boundaries.
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

* Update doctrine maps for Phase 16 authorities.
* Mark implementation-backed guarantees separately from planned future work.
* Update diagrams or tables only when they match implementation.
* Record intentionally excluded capabilities to prevent scope creep.

### Exit criteria

* No known Phase 16 authority conflict remains unresolved.
* Deterministic artifacts have explicit identity and ordering rules.
* Every new subsystem has a verification strategy.
* Documentation, tests, and contracts agree on authority boundaries.
* Phase 16.C can audit implementation without relying on aspiration.

## Phase 16.C — Architecture Certification and Architectural Tests

### Purpose

Certify that Phase 16 is architecturally correct before Phase 17 begins. This milestone exists solely to prove correctness, not to add features.

### Architecture audits

* Audit every Phase 16 subsystem against its declared authority.
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

* Run deterministic fixture scenarios for all Phase 16 outputs.
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

* Inspect source paths changed during Phase 16.
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

### Promotion criteria for Phase 17

Phase 17 may begin only when Phase 16.C certifies that Phase 16 artifacts are stable, deterministic where required, authority-safe, and regression-protected.
