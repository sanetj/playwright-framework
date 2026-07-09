# Phase 13–18 Strategic Architecture Roadmap

## Scope and method

This roadmap is implementation-first. It treats the current code as the source of truth and treats documents, manifests, and previous planning as context only. The repository has crossed the boundary from a general Playwright automation framework into a browser security investigation platform: its core path launches role-isolated sessions, captures canonical HTTP evidence, infers resources and ownership, synthesizes replay candidates, validates them, ranks them, builds attack graphs, analyzes consistency/novelty/sufficiency, plans explanations, and projects bundles.

The roadmap below optimizes for deterministic correctness, architectural longevity, research value, real-world investigation capability, browser security rigor, maintainability, and extensibility. It intentionally does not optimize for feature count.

## Part 1 — Current architectural maturity

### Complete capabilities

#### Replay-backed investigation pipeline

**Verified observation:** The repository has a concrete `InvestigationPipeline` that coordinates isolated sessions, interceptors, crawling, resource extraction, ownership inference, replay validation, candidate synthesis, prioritization, attack graph construction, consistency analysis, novelty analysis, sufficiency analysis, explanation planning, bundle projection, and cleanup. This is complete as a runnable end-to-end path.

**Why stable:** The pipeline has enough implemented stages to serve as the current architectural spine. It should not be expanded casually; it should be decomposed and hardened.

#### Investigation Context

**Verified observation:** `DefaultInvestigationContext` tracks status, evidence exchange IDs, validated finding IDs, prioritized candidates, attack graphs, consistency reports, novelty reports, sufficiency reports, explanation plans, and target URL.

**Why stable:** The concept is correct: investigation context should preserve references to truth and carry derived investigation state without owning runtime evidence.

**Caveat:** It is not immutable enough. Future phases should preserve the abstraction but harden representation boundaries.

#### Candidate synthesis and prioritization

**Verified observation:** There are implemented paths for replay candidate synthesis from resource signals and ownership inventory, plus investigation candidate synthesis from validated findings. Prioritization is deterministic over scored candidates.

**Why stable:** These form a useful middle layer between raw replay truth and human/research-facing reasoning. The concepts should remain, but duplicate naming and lifecycle boundaries need cleanup.

#### Multi-step attack graph, consistency, novelty, sufficiency, and explanation planning

**Verified observation:** Attack graph construction, consistency analysis, structural novelty analysis, evidence sufficiency analysis, and explanation planning are implemented as mostly pure DTO transformations.

**Why stable:** These are the strongest architectural slices. They are deterministic, locally cohesive, and naturally testable. They should remain untouched at the concept level for several phases while surrounding infrastructure improves.

#### Bundle projection

**Verified observation:** The bundle compressor projects context and evidence into an AI-oriented investigation bundle and performs redaction/filtering.

**Why stable:** Bundle ownership of representation is architecturally correct. Bundle serialization should remain representational only.

### Partially complete capabilities

#### Deterministic orchestration

**Verified observation:** Many internal stages sort arrays and create deterministic identities. However, the runtime path still uses wall-clock time, event order, live network behavior, sequence counters, and unsorted header/object enumeration in places.

**Assessment:** Partially complete. Determinism exists inside selected analyzers, not across the full lifecycle.

#### Read-only investigation lifecycle

**Verified observation:** Investigation context blocks mutation after `COMPLETED` or `BUNDLED`, but returns internal arrays through readonly TypeScript types that are not runtime-frozen.

**Assessment:** Partially complete. The lifecycle is asserted by methods, not enforced across all references.

#### Validation architecture

**Verified observation:** Replay validation has mutation planning, replay coordination, semantic proof validation, and exploit validation. However, null validation paths can become validation-shaped objects without complete proof contracts.

**Assessment:** Partially complete. The intended authority is strong; the result algebra is underpowered.

#### Architecture authority separation

**Verified observation:** Interfaces exist, especially `IExecutionGateway`, and docs define authorities. But the active pipeline directly imports concrete Playwright runtime and other infrastructure classes.

**Assessment:** Partially complete. Dependency inversion is local rather than systemic.

### Foundations only

#### Intelligence Kernel

**Verified observation:** `IntelligenceKernel` can register analyzers and run them over normalized events. It is not the actual end-to-end investigation authority.

**Assessment:** Foundation only. It should either become a real stage registry or be demoted from canonical status.

#### Exploration frontier and autonomous exploration

**Verified observation:** Runtime exploration files exist, including exploration budget, strategy, frontier priority, autonomous explorer, and frontier contracts. They are not the dominant Phase 12 flow.

**Assessment:** Foundation only. Exploration should not become Phase 13 unless determinism and validation are hardened first.

#### Epistemics, uncertainty, causality, memory-like concepts

**Verified observation:** Epistemic state, epistemic influence, confidence propagation, causal cognition graph, and frozen memory stratification concepts exist.

**Assessment:** Foundation only. They are conceptually aligned with future research, but not yet grounded enough to drive orchestration.

#### Governance manifests

**Verified observation:** Governance files and architecture manifests exist, but they are not enforced by static or runtime checks.

**Assessment:** Foundation only. They should become executable governance in Phase 13.

### Stable abstractions that should remain untouched conceptually

1. **Canonical HTTP exchange** — It is the correct substrate for replay-backed evidence.
2. **Replay proof / validated finding** — The repository’s security claims should continue to flow through proof-backed validation.
3. **Investigation context** — Correct as a state carrier, but should be hardened, not replaced.
4. **Prioritized candidate** — Useful boundary between synthesis and graph reasoning.
5. **Investigation attack graph** — Correct derived reasoning structure.
6. **Consistency, novelty, sufficiency, explanation plan** — Strong pure analyzers; should evolve by adding rules, not by changing authority.
7. **Bundle as representation owner** — Correct final projection boundary.

### Architecture that should remain untouched for multiple phases

The internal semantics of candidate priority, attack graph edge categories, consistency contradiction categories, novelty categories, sufficiency status categories, and explanation step categories should not churn during Phase 13. These are the few places where the repository has achieved local conceptual stability. Churning them before the runtime/evidence substrate is hardened would create avoidable migration debt.

## Part 2 — Original roadmap audit

No previous roadmap should be accepted as authoritative unless it matches the implementation trajectory. The implementation says the next work should not be more intelligence features. The next work should be hardening the truth substrate.

### Would I keep the existing progression?

Only partially. If the existing progression assumes Phase 13 should add new high-level reasoning, exploration, memory, or AI-native features, I would reject it. The implemented repository is not ready for more top-level capability until replay determinism, validation result shape, boundary enforcement, and evidence lineage are made non-bypassable.

### Would I reorder future work?

Yes. The optimal order is:

1. Deterministic truth hardening.
2. Executable architecture governance and boundary enforcement.
3. Replay strategy and validation algebra.
4. Investigation planning and exploration frontier.
5. Multi-investigation memory and knowledge state.
6. Empirical research/evaluation platform.

This order follows dependency logic: exploration without deterministic evidence creates noisy state; memory without stable truth stores unreliable conclusions; empirical research without reproducibility is weak science.

### Would I merge phases?

I would merge any planned separate phases for “deterministic IDs,” “immutable context,” “bundle reproducibility,” and “validation result cleanup” into one Phase 13 hardening phase. These are not independent features; they are one correctness substrate.

### Would I split phases?

I would split any broad “investigation planning” phase into two phases:

* Replay strategy and validation algebra.
* Exploration frontier and investigation scheduling.

Reason: replay strategy works from known candidates and evidence. Exploration frontier creates new evidence. Combining them will blur authority.

### Would I remove planned phases?

I would remove or defer any phase focused on natural-language report generation, AI summarization, autonomous attack chaining, or persistent memory until proof algebra and reproducibility are enforced. Those features would amplify current weaknesses.

## Part 3 — Optimal Phase 13–18 roadmap

## Phase 13 — Deterministic Truth and Boundary Hardening

### Purpose

Turn Phase 12 from a strong prototype baseline into a deterministic, enforceable architectural baseline.

### Architectural objective

Make replay/evidence truth reproducible, make validation result shape non-bypassable, make context boundaries immutable, and convert architecture doctrine into executable checks.

### Capabilities introduced

* Deterministic clock and identity providers.
* Canonical request/response serialization.
* Content-addressed request body fingerprints.
* Stable header normalization.
* Validation result union: supported, rejected, inconclusive, invalid replay, insufficient evidence.
* Deep-frozen or value-copied investigation context outputs.
* Top-level runtime cleanup with `try/finally`.
* Static dependency boundary tests.
* Golden determinism tests for bundle output.
* Architecture governance tests for forbidden imports and canonical authority violations.

### Capabilities intentionally excluded

* New exploration behavior.
* New novelty categories.
* Persistent memory.
* Autonomous planning.
* LLM summarization.
* Multi-investigation reasoning.

### New invariants

* Identical canonical inputs produce byte-identical derived outputs.
* Supported findings must have replay proof lineage.
* Rejected/inconclusive findings must be structurally complete and cannot masquerade as supported proof objects.
* Bundle projection cannot create time-dependent fields unless the clock is injected.
* Orchestration cannot import concrete runtime infrastructure except through allowed adapters.
* Context arrays cannot be mutated through public getters.

### Dependencies on previous phases

Depends on Phase 12 pipeline, context, validation, graph, sufficiency, and bundle projection being implemented.

### Risks

* Hardening may reveal that some current tests rely on incidental ordering or wall-clock behavior.
* Boundary enforcement may require adapter refactors.
* Deterministic serialization can be tedious and invasive.

### Expected architectural outcome

A certifiable baseline where evidence, replay, context, and bundle outputs can be reproduced and governed.

### Why this phase should exist

Every future capability depends on stable truth. Without this phase, later research and product features will store and amplify nondeterministic artifacts.

## Phase 14 — Replay Strategy and Validation Algebra

### Purpose

Move validation from “execute the first generated mutation plan” to a principled replay strategy engine with explicit result algebra and confidence semantics.

### Architectural objective

Separate replay planning, replay strategy selection, execution, proof capture, semantic evaluation, and validation conclusion.

### Capabilities introduced

* Replay strategy interface.
* Strategy selection based on candidate type, authorization vector, risk classification, and evidence sufficiency.
* Multiple replay attempts with deterministic ordering.
* Negative replay controls.
* Replay minimization integration.
* Proof algebra tying evidence sufficiency, semantic success, confidence, and validation conclusion together.
* Confidence algebra for supported/rejected/inconclusive states.
* Replay failure diagnostics.

### Capabilities intentionally excluded

* Autonomous exploration of new surfaces.
* Cross-investigation memory.
* Human workflow UI.
* Research benchmarking harness beyond deterministic validation fixtures.

### New invariants

* Validation conclusions must be derived from replay result algebra, not casts or partial objects.
* A replay strategy cannot mutate source evidence.
* Negative controls must be distinguishable from failed exploit attempts.
* Validation confidence must be decomposable into evidence quality, replay stability, semantic match, and environment stability.

### Dependencies on previous phases

Requires Phase 13 deterministic identity, canonical serialization, and validation result hardening.

### Risks

* Too much strategy abstraction could overfit current vulnerability classes.
* Confidence algebra could become decorative unless tests assert it.

### Expected architectural outcome

Replay validation becomes a scientific subsystem rather than an execution helper.

### Why this phase should exist

The repository’s doctrine says replay is canonical truth. Therefore replay must become strategically rigorous, not merely executable.

## Phase 15 — Investigation Planning, Frontier, and Scheduling

### Purpose

Introduce controlled, evidence-aware planning for what to investigate next.

### Architectural objective

Separate investigation planning from runtime exploration while using validated evidence and sufficiency gaps to choose next steps.

### Capabilities introduced

* Investigation planner that consumes context, sufficiency reports, validation outcomes, and candidate priority.
* Exploration frontier model grounded in evidence gaps.
* Investigation scheduling with deterministic ordering.
* Budget-aware planning using existing exploration budget foundations.
* Negative knowledge representation for attempted-but-invalid paths.
* Replay-vs-explore decision policy.
* Stop conditions based on sufficiency and diminishing returns.

### Capabilities intentionally excluded

* Persistent cross-target memory.
* Autonomous destructive actions.
* Unbounded crawler behavior.
* LLM-driven action selection without deterministic policy wrapper.

### New invariants

* Planner consumes truth but does not create evidence.
* Frontier entries must cite the evidence gap or sufficiency observation that caused them.
* Negative knowledge must be represented separately from absence of evidence.
* Scheduling must be deterministic for the same investigation state.

### Dependencies on previous phases

Requires Phase 13 deterministic state and Phase 14 validation algebra.

### Risks

* Planner can become a god object if it owns exploration, replay, and prioritization.
* Frontier can become a dumping ground for speculative ideas unless every item has provenance.

### Expected architectural outcome

The repository evolves from a single-pass pipeline to a controlled investigation loop.

### Why this phase should exist

The implemented sufficiency analyzer naturally asks, “What is missing?” Phase 15 turns that question into deterministic next-step planning.

## Phase 16 — Knowledge State and Multi-Investigation Reasoning

### Purpose

Persist and reason over stable knowledge across investigations without contaminating canonical evidence.

### Architectural objective

Introduce a knowledge layer that stores derived, versioned, provenance-backed knowledge separately from replay truth.

### Capabilities introduced

* Investigation state snapshots.
* Knowledge state separate from runtime evidence.
* Multi-investigation correlation by resource family, ownership boundary, authorization vector, and replay proof type.
* Knowledge decay/versioning.
* Provenance graph across investigations.
* Cross-run stability metrics.
* Negative knowledge memory.

### Capabilities intentionally excluded

* Global mutable truth store.
* Learning conclusions without provenance.
* Automatic trust in old investigations under changed environments.
* Product analytics unrelated to security investigation.

### New invariants

* Knowledge is derived, versioned, and revocable.
* Replay evidence remains canonical for any individual claim.
* Cross-investigation conclusions must cite constituent investigations and proof lineage.
* Environmental drift must be explicit.

### Dependencies on previous phases

Requires deterministic artifacts, validation algebra, and investigation state snapshots.

### Risks

* Memory can silently become authority over replay.
* Cross-run correlation can create false confidence if environment drift is ignored.

### Expected architectural outcome

The platform can reason across campaigns while preserving evidence authority.

### Why this phase should exist

The repository already contains hints of epistemics, memory, ownership registries, and knowledge graphs. These should only become central after truth hardening.

## Phase 17 — Empirical Research Harness and Benchmarking

### Purpose

Convert architecture claims into measurable scientific claims.

### Architectural objective

Build a reproducible evaluation environment for determinism, validation accuracy, false positive suppression, replay stability, novelty usefulness, and investigation efficiency.

### Capabilities introduced

* Benchmark targets and fixture suites.
* Golden replay corpora.
* Determinism benchmark reports.
* Validation precision/recall measurement.
* False positive/negative taxonomy.
* Novelty usefulness evaluation.
* Planner efficiency metrics.
* Cross-browser reproducibility matrix.
* Artifact replay package for publications.

### Capabilities intentionally excluded

* Major new runtime features.
* Product UI.
* Large autonomous agent behavior beyond benchmarked policies.

### New invariants

* Every research claim must map to a benchmark metric.
* Benchmarks must be reproducible from pinned artifacts.
* Evaluation results must distinguish target instability from framework nondeterminism.

### Dependencies on previous phases

Requires stable deterministic outputs, replay strategy, planner, and knowledge state.

### Risks

* Benchmark harness can become performative if it does not include negative cases.
* Overfitting to benchmark targets can weaken real-world capability.

### Expected architectural outcome

The repository becomes credible as a security research platform rather than only a clever engineering system.

### Why this phase should exist

The differentiated ideas need empirical validation to become publishable research.

## Phase 18 — Extensible Browser Intelligence Platform

### Purpose

Stabilize the repository as an extensible platform for browser security intelligence and investigation.

### Architectural objective

Define public extension boundaries for evidence sources, replay strategies, analyzers, planners, exporters, and benchmarks while preserving canonical truth doctrine.

### Capabilities introduced

* Plugin/extension contracts for evidence sources, replay strategies, analyzers, planners, exporters, and benchmark packs.
* Public stable DTO versioning.
* Backward-compatible bundle schemas.
* Policy-governed extension loading.
* Capability manifests and architecture conformance checks.
* Long-term deprecation/versioning rules.

### Capabilities intentionally excluded

* Arbitrary plugins that can mutate canonical evidence.
* Analyzer extensions that bypass validation doctrine.
* Exporters that generate conclusions.
* Unversioned public APIs.

### New invariants

* Extensions can add observations but cannot mutate canonical evidence.
* Extension outputs must declare authority, dependencies, and determinism class.
* Public DTO evolution must be versioned.
* Core replay/validation contracts remain stable.

### Dependencies on previous phases

Requires hardening, strategy, planning, knowledge, and benchmarks.

### Risks

* Extension systems create attack surface and boundary erosion.
* Premature public APIs can freeze bad abstractions.

### Expected architectural outcome

A durable browser intelligence platform with scientific evaluation and controlled extensibility.

### Why this phase should exist

The repository naturally wants to support multiple evidence sources, analyzers, replay strategies, and exporters, but should not expose extension points until authority boundaries are enforceable.

## Part 4 — Missing concepts that naturally emerge

### Investigation State

The current context records lifecycle and derived arrays, but there is no formal immutable investigation state snapshot. This should exist because planning, replay strategy, and multi-investigation reasoning need stable state snapshots.

### Knowledge State

Knowledge state should store derived, versioned, cross-investigation knowledge. It must not replace replay evidence.

### Exploration Frontier

Frontier concepts already exist in runtime exploration files. The missing piece is tying frontier items to sufficiency gaps and evidence provenance.

### Negative Knowledge

The system needs a way to represent tested hypotheses that failed, invalid replay attempts, insufficient evidence paths, and false-positive eliminations. Absence of evidence is not equivalent to negative knowledge.

### Investigation Memory

Memory is appropriate only after deterministic snapshots and provenance are stable. It should store evidence-backed patterns, not unverified conclusions.

### Investigation Planning

Sufficiency reports and candidate priorities naturally imply next-step planning. Planning should consume context and produce scheduled actions, not execute them.

### Replay Strategy

Replay validation currently executes one selected plan. Strategy should become explicit and testable.

### Investigation Scheduling

Once planning exists, scheduling determines deterministic order under budgets, risk, and evidence gaps.

### Confidence Algebra

Confidence appears across validation, evidence, novelty, sufficiency, and scoring. It needs a unified algebra so confidence is not an arbitrary numeric/named field.

### Multi-investigation reasoning

The presence of ownership inference, attack graphs, and provenance naturally points toward campaign-level reasoning. It must be delayed until evidence and knowledge boundaries are stable.

## Part 5 — Architectural alternatives

### If starting today, would I build the same architecture?

Not exactly. I would keep the evidence-first security investigation direction, but I would invert control earlier.

### What I would change

* Start with canonical evidence, replay proof, validation result algebra, and deterministic serialization as the first primitives.
* Build the investigation pipeline as registered stages rather than a hard-coded method.
* Make the kernel either truly central or remove the claim of centrality.
* Treat Playwright as one runtime adapter, not an imported dependency in orchestration.
* Add executable architecture governance from the beginning.

### Abstractions that would disappear or shrink

* Placeholder canonical factories with no behavior.
* Parallel graph concepts unless each has clear authority.
* Frozen modules that are not active contracts.
* Direct phase-history comments embedded in code.

### Abstractions that would become more central

* Canonical evidence.
* Replay proof.
* Validation result algebra.
* Investigation state snapshot.
* Deterministic identity and serialization.
* Governance checks.

### Abstractions that should become extension points

* Evidence sources.
* Replay strategies.
* Candidate scoring components.
* Attack graph rule packs.
* Consistency/novelty/sufficiency rule packs.
* Exporters.
* Benchmark packs.

## Part 6 — Phase 13 readiness

Phase 13 should focus primarily on architectural hardening, runtime validation, and deterministic correctness.

It should not focus primarily on new capabilities. The implementation has enough capability surface. The risk is that future work will layer new intelligence over unstable truth boundaries.

Priority order for Phase 13:

1. Deterministic identity, clock, serialization, and bundle reproducibility.
2. Complete validation result algebra.
3. Runtime cleanup and failure semantics.
4. Immutable context boundaries.
5. Static dependency and authority enforcement.
6. Determinism regression tests.

## Part 7 — Research direction

The repository is no longer best described as a Playwright framework. It is evolving toward a browser intelligence and security investigation platform.

### Why

A Playwright framework automates browser workflows and assertions. This repository captures evidence, infers resources and ownership, validates replay hypotheses, builds attack graphs, evaluates structural novelty and sufficiency, and plans explanations. Those are investigation-platform behaviors.

### Genuinely differentiated ideas

* Evidence-first replay candidate synthesis from passive browser traffic.
* Ownership-aware authorization investigation.
* Replay-backed validation feeding attack graph construction.
* Structural novelty and sufficiency reports over investigation graphs.
* Explanation planning as a dependency graph rather than prose generation.
* AI bundle projection with lineage and redaction.

### Merely good engineering

* Playwright multi-session isolation.
* DTO-based analyzers.
* Sorting for deterministic local output.
* Bundle redaction.
* Candidate scoring and ranking.

### Publishable with empirical validation

* Replay-backed browser authorization investigation.
* Ownership-aware replay prioritization.
* Evidence sufficiency as a stopping/planning criterion.
* Structural novelty for exploit-chain triage.
* Deterministic investigation bundles for AI-assisted security research.

## Part 8 — Critical questions

### 1. What architectural mistakes are likely if the current trajectory continues?

* Adding new intelligence features before deterministic truth is enforced.
* Letting `InvestigationPipeline` become a permanent god orchestrator.
* Treating documentation manifests as governance without executable checks.
* Allowing memory or planning to become a second source of truth.
* Adding LLM/reporting features that create conclusions without replay proof.

### 2. Which future ideas should be rejected now?

* Autonomous exploit chaining without proof algebra.
* Persistent memory that can override replay truth.
* Natural-language report generation as an architecture phase.
* Plugin systems before authority boundaries are enforceable.
* New graph systems unless their authority is distinct.

### 3. Which current abstractions are over-engineered?

* Kernel canonicality relative to its actual use.
* Some frozen contract modules that do not drive runtime behavior.
* Multiple graph concepts without clearly enforced ownership.
* Empty or placeholder factories.

### 4. Which abstractions are under-powered?

* Validation result model.
* Deterministic identity and clock model.
* Investigation context immutability.
* Replay strategy selection.
* Architecture governance enforcement.
* Confidence semantics.

### 5. Which future work will likely create architectural debt?

* More hard-coded pipeline stages.
* Cross-investigation memory before deterministic snapshots.
* LLM-first explanation/reporting.
* Browser exploration before negative knowledge and scheduling exist.
* Extension APIs before boundary enforcement.

### 6. Which future work would compound strengths?

* Deterministic canonical serialization.
* Proof-backed validation algebra.
* Sufficiency-driven planning.
* Evidence-source adapters.
* Rule-pack architecture for analyzers.
* Benchmark-driven research harness.

## Part 9 — Final recommended roadmap

### Primary roadmap

1. Phase 13: Deterministic Truth and Boundary Hardening.
2. Phase 14: Replay Strategy and Validation Algebra.
3. Phase 15: Investigation Planning, Frontier, and Scheduling.
4. Phase 16: Knowledge State and Multi-Investigation Reasoning.
5. Phase 17: Empirical Research Harness and Benchmarking.
6. Phase 18: Extensible Browser Intelligence Platform.

### Alternative A — Enterprise product roadmap

1. Hardening and security controls.
2. Stable reporting/export schemas.
3. RBAC, audit logs, deployment, tenancy, and policy management.
4. Integration APIs.
5. UI workflows.
6. Limited extensibility.

**Tradeoff:** Strong operational value, weaker research novelty.

### Alternative B — Academic research roadmap

1. Determinism and reproducibility.
2. Formal validation algebra.
3. Benchmark corpus.
4. Controlled experiments on replay-backed authorization testing.
5. Publishable novelty/sufficiency metrics.
6. Open artifact packaging.

**Tradeoff:** Strong scientific rigor, slower product capability.

### Alternative C — Bug bounty platform roadmap

1. Replay validation hardening.
2. False-positive suppression.
3. Bounty report serialization.
4. Target-safe exploration planning.
5. ROI prioritization.
6. Evidence bundle export.

**Tradeoff:** High practical value, risk of narrowing architecture around bounty workflows.

### Alternative D — Browser intelligence platform roadmap

1. Evidence and event normalization.
2. Runtime adapters.
3. Analyzer extension system.
4. Knowledge state.
5. Planning/scheduling.
6. Public plugin ecosystem.

**Tradeoff:** Broadest long-term platform value, highest boundary/governance risk.
