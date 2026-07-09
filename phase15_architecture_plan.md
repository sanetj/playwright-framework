# Phase 15 Architecture Plan — Investigation Planning, Frontier Control, and Researcher Leverage

## Phase Overview

### Vision

Move from single-pass investigation to deterministic, evidence-driven planning that tells expert researchers what to do next, what not to repeat, and where the highest expected value lies.

### Architectural objective

Introduce planning, frontier, scheduling, budget, and negative-knowledge concepts while ensuring the planner never replaces replay, validation, or evidence authority.

### Why this phase exists

Bug bounty productivity improves when the platform reduces wasted exploration and focuses researcher time on high-value evidence gaps and replay opportunities.

### Relationship to previous phases

It consumes Phase 14 proof ROI, suppression, negative controls, proof quality, and validation cost signals.

### Relationship to subsequent phases

It produces stable investigation-state and negative-knowledge concepts that Phase 16 can persist across investigations.

### Non-negotiable doctrines

* Replay remains canonical truth.
* Evidence remains canonical truth.
* The Investigation Pipeline owns orchestration.
* Bundle projection owns representation only.
* Derived intelligence never mutates canonical truth.
* Deterministic derived intelligence is preferred over heuristic convenience.
* AI, if introduced downstream in later work, remains advisory and never authoritative.

## Phase 15.1 — Investigation State Model

### Purpose

Define investigation state as an immutable planning input derived from Phase 12/14 context, validation outcomes, sufficiency reports, proof quality, and negative controls.

### Problem Statement

Planning cannot operate safely on mutable orchestration context or raw runtime state.

### Architectural Motivation

A planner needs a stable snapshot of what is known, unknown, validated, rejected, suppressed, and costly.

### Capabilities Introduced

Investigation state schema; known/unknown/evidence-gap categories; state versioning; state provenance.

### Capabilities Explicitly Excluded

No persistent memory; no autonomous execution; no AI planner.

### New Subsystems

Investigation State Projector; State Provenance Index.

### Subsystem Changes

Context remains orchestration state; Investigation State becomes planning input.

### Contracts Introduced

InvestigationState; EvidenceGap; KnownFact; UnknownQuestion.

### Authority Changes

Planning consumes state; it does not create truth.

### Pipeline Changes

Pipeline adds state projection after sufficiency/proof quality.

### Determinism Requirements

Same completed investigation snapshot yields same planning state.

### Repository Doctrines Affected

Investigation consumes truth but does not own it.

### Dependencies

Phase 14 proof baseline.

### Risks

State could duplicate context; keep it projection-oriented.

### Verification Strategy

State snapshot equivalence tests.

### Success Criteria

Planner has a deterministic input model.

### Readiness Criteria for 15.2

15.2 begins when state categories are stable.

## Phase 15.2 — Negative Knowledge Ledger

### Purpose

Define first-class negative knowledge for failed replay attempts, invalid hypotheses, suppressed false positives, exhausted controls, and safe resources.

### Problem Statement

Without negative knowledge, planners repeat failed work and cannot explain why no further action is recommended.

### Architectural Motivation

Negative knowledge is essential to minimizing unnecessary replay and investigator effort.

### Capabilities Introduced

Negative knowledge taxonomy; invalid-vs-rejected-vs-suppressed distinctions; expiry/drift sensitivity; provenance rules.

### Capabilities Explicitly Excluded

No persistent cross-investigation memory yet; no deletion of positive evidence.

### New Subsystems

Negative Knowledge Ledger; Negative Knowledge Classifier.

### Subsystem Changes

Validation and suppression outcomes can emit negative knowledge records.

### Contracts Introduced

NegativeKnowledgeRecord; NegativeKnowledgeReason; ExpiryCondition.

### Authority Changes

Negative knowledge is derived state, not canonical truth.

### Pipeline Changes

Pipeline projects negative knowledge after validation/suppression.

### Determinism Requirements

Record identity deterministic from evidence, validation variant, and reason.

### Repository Doctrines Affected

Evidence > conclusions; Planning > randomness.

### Dependencies

15.1 investigation state.

### Risks

Misclassifying unknown as negative; require explicit evidence of attempted/disproven path.

### Verification Strategy

Tests distinguishing absent evidence from negative knowledge.

### Success Criteria

Planner can avoid proven-dead paths.

### Readiness Criteria for 15.3

15.3 begins when negative records are trustworthy.

## Phase 15.3 — Exploration Frontier Contract

### Purpose

Define frontier entries as evidence-gap-driven possible actions with provenance, risk, expected value, and deterministic ordering.

### Problem Statement

Exploration foundations exist, but uncontrolled frontier creation would become another crawler.

### Architectural Motivation

The platform should explore only when evidence or sufficiency gaps justify it.

### Capabilities Introduced

Frontier entry schema; gap-to-action mapping; expected value components; risk tags; replay-vs-browser-action distinction.

### Capabilities Explicitly Excluded

No random crawling; no autonomous exploitation; no memory persistence.

### New Subsystems

Frontier Builder; Evidence Gap Mapper.

### Subsystem Changes

Sufficiency and proof ROI feed frontier creation.

### Contracts Introduced

FrontierEntry; FrontierActionType; ExpectedValueSignal.

### Authority Changes

Frontier owns proposed actions, not execution truth.

### Pipeline Changes

Pipeline can emit frontier recommendations after bundle/sufficiency stages.

### Determinism Requirements

Frontier ordering must be stable under same state.

### Repository Doctrines Affected

Planning > randomness; Authority > convenience.

### Dependencies

15.2 negative knowledge.

### Risks

Frontier could become speculative; require gap provenance.

### Verification Strategy

Fixture state to frontier snapshot tests.

### Success Criteria

Every frontier item cites a concrete evidence gap or ROI opportunity.

### Readiness Criteria for 15.4

15.4 begins when frontier contract is accepted.

## Phase 15.4 — Deterministic Investigation Scheduler

### Purpose

Define deterministic scheduling over frontier entries using budget, risk, proof ROI, sufficiency gaps, and negative knowledge.

### Problem Statement

A frontier without scheduling does not reduce investigator effort.

### Architectural Motivation

Scheduling maximizes value per investigation hour while preserving safety and determinism.

### Capabilities Introduced

Scheduling policy; budget classes; priority tie-breakers; safety gates; stop/defer decisions.

### Capabilities Explicitly Excluded

No execution engine replacement; no adaptive randomness; no AI-only priority.

### New Subsystems

Investigation Scheduler; Budget Policy Evaluator.

### Subsystem Changes

Scheduler consumes frontier and emits ordered plan; runtime still executes only through existing authority.

### Contracts Introduced

InvestigationSchedule; BudgetConstraint; StopDecision.

### Authority Changes

Scheduler owns order and budget, not evidence or validation.

### Pipeline Changes

Pipeline may expose schedule as derived artifact for future execution loop.

### Determinism Requirements

Same state and policy produce same schedule.

### Repository Doctrines Affected

Determinism > heuristics; Planning > randomness.

### Dependencies

15.3 frontier contract.

### Risks

Over-optimizing for ROI could miss severe low-frequency issues; keep sufficiency and impact separate.

### Verification Strategy

Schedule determinism and policy tests.

### Success Criteria

Researchers receive stable next-action ordering.

### Readiness Criteria for 15.5

15.5 begins when scheduling rules are stable.

## Phase 15.5 — Researcher-in-the-Loop Decision Points

### Purpose

Define where expert researchers approve, reject, annotate, or execute planned actions without weakening canonical replay authority.

### Problem Statement

The objective is not automatic hacking; expert researchers remain in control.

### Architectural Motivation

Human decision points increase safety and ROI while preserving deterministic records of what was chosen and why.

### Capabilities Introduced

Decision point schema; approval classes; annotation records; manual evidence attachment policy; audit trail.

### Capabilities Explicitly Excluded

No free-form mutation of canonical evidence; no LLM autonomous approval.

### New Subsystems

Researcher Decision Ledger; Approval Gate Model.

### Subsystem Changes

Scheduler output can require researcher approval before runtime action.

### Contracts Introduced

ResearcherDecision; ApprovalClass; ManualAnnotation.

### Authority Changes

Human decisions authorize action but do not create replay truth.

### Pipeline Changes

Pipeline emits approval-required plan artifacts, not automatic actions.

### Determinism Requirements

Decision records must be ordered and attributable.

### Repository Doctrines Affected

Authority > convenience; Proof > probability.

### Dependencies

15.4 scheduler.

### Risks

Manual annotations can become unverified truth; mark as annotations only.

### Verification Strategy

Audit tests for annotation vs evidence separation.

### Success Criteria

Human control is explicit and traceable.

### Readiness Criteria for 15.6

15.6 begins when decision boundaries are clear.

## Phase 15.6 — Investigation Loop Semantics

### Purpose

Define controlled loop semantics for repeating evidence capture, replay validation, sufficiency assessment, and planning until stop criteria are met.

### Problem Statement

Phase 12 is a single-pass pipeline; high-value investigations require iterative refinement.

### Architectural Motivation

A deterministic loop allows focused follow-up without turning into random crawling.

### Capabilities Introduced

Loop lifecycle; iteration identity; state transition rules; stop criteria; budget exhaustion; carry-forward of negative knowledge.

### Capabilities Explicitly Excluded

No persistent cross-investigation memory; no unbounded recursion; no autonomous unsafe actions.

### New Subsystems

Investigation Loop Controller; Iteration Ledger.

### Subsystem Changes

Pipeline remains orchestrator but gains planned iteration semantics.

### Contracts Introduced

InvestigationIteration; LoopStopReason; CarryForwardState.

### Authority Changes

Loop controller orchestrates iterations, not truth.

### Pipeline Changes

Pipeline can repeat established stages under schedule control.

### Determinism Requirements

Iteration ordering and stop decisions deterministic.

### Repository Doctrines Affected

Replay > inference; Planning > randomness.

### Dependencies

15.5 decision points.

### Risks

Loop can become complex; cap iterations and require explicit stop conditions.

### Verification Strategy

Loop fixture tests for stop/defer/retry paths.

### Success Criteria

Investigation can improve evidence with bounded, traceable iterations.

### Readiness Criteria for 15.7

15.7 begins when loop semantics are bounded.

## Phase 15.7 — Planning ROI Baseline

### Purpose

Integrate investigation state, negative knowledge, frontier, scheduling, human decision points, and loop semantics into a planning baseline.

### Problem Statement

Planning components must collectively improve ROI rather than add process overhead.

### Architectural Motivation

The baseline should prove that planning reduces duplicate work and focuses replay/exploration.

### Capabilities Introduced

Planning ROI metrics; wasted-action accounting; repeated-work prevention; sufficiency-driven stop reporting.

### Capabilities Explicitly Excluded

No cross-investigation memory; no plugins; no research benchmark claims.

### New Subsystems

Planning ROI Scorecard; Duplicate Work Detector.

### Subsystem Changes

Planning artifacts become first-class derived intelligence in bundle/readiness outputs.

### Contracts Introduced

PlanningRoiSignal; DuplicateWorkRecord; PlanningOutcome.

### Authority Changes

ROI is advisory; replay remains truth.

### Pipeline Changes

Pipeline emits planning outputs after investigation state generation.

### Determinism Requirements

Planning metrics deterministic from schedule and outcomes.

### Repository Doctrines Affected

Investigator leverage; minimize unnecessary replay.

### Dependencies

15.1 through 15.6.

### Risks

Metrics could incentivize shallow investigations; balance with sufficiency.

### Verification Strategy

Scenario tests comparing planned vs unplanned workflows.

### Success Criteria

Planning baseline ready for hardening.

### Readiness Criteria for 15.H

15.H begins when planning artifacts compose cleanly.

## Phase 15.H — Architecture Hardening

### Purpose

Stabilize Phase 15 after its seven feature milestones and remove drift before certification. This milestone is not a feature phase and must not introduce new capability surface.

### Architecture improvements

* Re-check that Phase 15 additions preserve the Phase 12 Investigation Pipeline as orchestration authority.
* Remove duplicate concepts introduced during planning.
* Collapse terminology that overlaps with earlier phases.
* Ensure each new subsystem has one explicit authority and one forbidden-responsibility list.
* Verify every derived artifact references canonical evidence, replay outcomes, or prior derived artifacts explicitly.

### Determinism improvements

* Verify deterministic ordering for all Phase 15 outputs.
* Require stable identity material for every new artifact.
* Separate fixture-mode determinism from live-mode observed variance.
* Ensure time, environment, and policy inputs are explicit.

### Boundary improvements

* Confirm that derived intelligence never mutates canonical evidence.
* Confirm that bundle/export/projector layers remain representation-only.
* Confirm that planning, knowledge, research, or platform surfaces do not create validation conclusions.
* Confirm that runtime adapters and policy gates do not score or interpret vulnerabilities.

### Lifecycle improvements

* Verify lifecycle states for all Phase 15 artifacts.
* Define creation, consumption, finalization, and archival boundaries.
* Ensure failure and partial-completion states are explicit.
* Ensure cleanup obligations are represented where runtime resources are involved.

### Verification improvements

* Add architecture tests for Phase 15 authority boundaries.
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

* Update doctrine maps for Phase 15 authorities.
* Mark implementation-backed guarantees separately from planned future work.
* Update diagrams or tables only when they match implementation.
* Record intentionally excluded capabilities to prevent scope creep.

### Exit criteria

* No known Phase 15 authority conflict remains unresolved.
* Deterministic artifacts have explicit identity and ordering rules.
* Every new subsystem has a verification strategy.
* Documentation, tests, and contracts agree on authority boundaries.
* Phase 15.C can audit implementation without relying on aspiration.

## Phase 15.C — Architecture Certification and Architectural Tests

### Purpose

Certify that Phase 15 is architecturally correct before Phase 16 begins. This milestone exists solely to prove correctness, not to add features.

### Architecture audits

* Audit every Phase 15 subsystem against its declared authority.
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

* Run deterministic fixture scenarios for all Phase 15 outputs.
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

* Inspect source paths changed during Phase 15.
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

### Promotion criteria for Phase 16

Phase 16 may begin only when Phase 15.C certifies that Phase 15 artifacts are stable, deterministic where required, authority-safe, and regression-protected.
