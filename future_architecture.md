# Future Architecture After Phase 18

## Target identity

After Phase 18, the repository should be a deterministic browser security intelligence platform. It should not be a generic Playwright framework, a generic crawler, or a report generator. Playwright should be one runtime adapter. Replay-backed evidence should remain canonical truth. Investigation, planning, memory, and bundle projection should be derived layers with explicit authority boundaries.

## Architectural thesis

The platform should answer this question:

> Given observed browser/runtime behavior, what security-relevant authorization, ownership, workflow, and state hypotheses can be replay-validated, prioritized, connected, explained, and reproduced?

Everything not serving that thesis should be secondary.

## Target layered architecture

### Layer 0 — Runtime adapters

Responsibilities:

* Launch browser/runtime sessions.
* Isolate roles and storage boundaries.
* Execute deterministic replay requests.
* Capture raw browser/runtime events.
* Enforce safety policy.

Allowed implementations:

* Playwright adapter.
* HAR adapter.
* Proxy adapter.
* CDP adapter.
* Fixture adapter for deterministic tests.

Forbidden responsibilities:

* Creating conclusions.
* Scoring candidates.
* Mutating canonical evidence after capture.
* Projecting bundles.

### Layer 1 — Canonical evidence

Responsibilities:

* Canonical HTTP exchanges.
* Stable exchange identities.
* Canonical request/response serialization.
* Evidence lineage.
* Redaction-safe raw evidence references.
* Environment fingerprints.

Invariants:

* Evidence identity is content-addressed or deterministically derived.
* Evidence is append-only.
* Evidence timestamps are either observed facts or injected deterministic test-time values.
* Evidence references are resolvable.

### Layer 2 — Replay and validation truth

Responsibilities:

* Replay strategy selection.
* Replay execution plans.
* Replay attempts.
* Proof capture.
* Semantic success evaluation.
* Validation result algebra.
* Replay minimization.
* Negative controls.

Invariants:

* Supported conclusions require proof lineage.
* Rejected and inconclusive results are first-class results, not malformed findings.
* Validation cannot mutate source evidence.
* Replay strategy is deterministic for the same state and policy.

### Layer 3 — Resource, ownership, and candidate intelligence

Responsibilities:

* Resource signal extraction.
* Ownership inference.
* Authorization vector classification.
* Candidate synthesis.
* Candidate scoring and prioritization.

Invariants:

* Candidates are hypotheses, not findings.
* Candidate identities are deterministic.
* Ownership claims carry confidence and evidence references.
* Candidate priority explains its components.

### Layer 4 — Investigation state and graph reasoning

Responsibilities:

* Immutable investigation snapshots.
* Investigation context lifecycle.
* Attack graph construction.
* Consistency analysis.
* Structural novelty.
* Evidence sufficiency.
* Explanation planning.

Invariants:

* Investigation consumes truth but does not own canonical evidence.
* Derived artifacts cite source evidence or validation results.
* Graphs are deterministic projections.
* Explanation plans order reasoning; they do not generate prose conclusions.

### Layer 5 — Planning and scheduling

Responsibilities:

* Identify evidence gaps.
* Create exploration frontier items.
* Schedule replay/exploration actions.
* Manage budgets.
* Track negative knowledge.
* Stop investigations when sufficiency criteria are met.

Invariants:

* Planner creates actions, not evidence.
* Frontier entries must cite originating insufficiency, contradiction, or validation gap.
* Scheduling is deterministic.
* Negative knowledge is distinct from absent evidence.

### Layer 6 — Knowledge state

Responsibilities:

* Store versioned derived knowledge across investigations.
* Correlate resource families, ownership boundaries, authorization vectors, and proof patterns.
* Track environment drift.
* Maintain cross-investigation provenance.

Invariants:

* Knowledge never overrides replay truth.
* Knowledge is revocable and versioned.
* Multi-investigation claims cite constituent proof lineage.

### Layer 7 — Projection and interfaces

Responsibilities:

* Bundle projection.
* Markdown or external report serialization.
* AI context optimization.
* Public DTO versioning.
* Export adapters.

Invariants:

* Projection owns representation only.
* Exporters cannot create intelligence.
* Public schema evolution is versioned.
* Redaction preserves lineage references.

### Layer 8 — Research and evaluation harness

Responsibilities:

* Benchmark targets.
* Golden replay corpora.
* Determinism reports.
* Precision/recall evaluation.
* Cross-browser reproducibility.
* Artifact packaging for publications.

Invariants:

* Every scientific claim maps to a metric.
* Benchmark artifacts are reproducible.
* Evaluation distinguishes target instability from framework nondeterminism.

## Target data flow

1. Runtime adapter captures browser/runtime observations.
2. Canonical evidence layer normalizes and stores append-only evidence.
3. Resource/ownership intelligence derives candidate hypotheses.
4. Replay strategy validates or rejects hypotheses with proof algebra.
5. Investigation state snapshots validated truth and derived artifacts.
6. Graph reasoning connects candidates and evaluates consistency, novelty, sufficiency.
7. Planner uses sufficiency gaps and negative knowledge to schedule next actions.
8. Knowledge state stores versioned cross-investigation patterns.
9. Bundle projection exports deterministic representations.
10. Research harness evaluates reproducibility and effectiveness.

## Target authority map

| Concern | Future authority | Must not own |
|---|---|---|
| Runtime execution | Runtime adapter | Conclusions, scoring, bundles |
| Evidence truth | Canonical evidence store | Candidate ranking, memory claims |
| Replay truth | Replay/validation subsystem | Exploration scheduling, reporting |
| Candidate hypotheses | Candidate synthesis | Proof conclusions |
| Priority | Scoring/prioritization | Evidence mutation |
| Investigation lifecycle | Investigation state/context | Runtime execution |
| Graph reasoning | Graph/analyzer layer | Evidence capture |
| Planning | Planner/scheduler | Proof generation |
| Knowledge | Knowledge state | Canonical truth |
| Representation | Bundle/export layer | New intelligence |
| Governance | Architecture policy tests | Runtime facts |

## Stable core contracts after Phase 18

The following should be public, versioned, and stable:

* Canonical HTTP exchange.
* Runtime exchange identity.
* Replay plan.
* Replay attempt.
* Exploit proof.
* Validation result union.
* Resource signal.
* Ownership observation.
* Investigation candidate.
* Prioritized candidate.
* Investigation attack graph.
* Consistency report.
* Structural novelty report.
* Evidence sufficiency report.
* Explanation plan.
* Investigation snapshot.
* Knowledge state record.
* Bundle manifest.

## Extension points after Phase 18

Extension points should be explicit and governed:

* Evidence source adapters.
* Runtime adapters.
* Replay strategies.
* Resource signal extractors.
* Ownership inference rules.
* Candidate scoring components.
* Graph edge rule packs.
* Consistency rules.
* Novelty rules.
* Sufficiency rules.
* Planners.
* Exporters.
* Benchmark packs.

Every extension should declare:

* Authority class.
* Inputs and outputs.
* Determinism class.
* Allowed dependencies.
* Forbidden dependencies.
* Schema versions.
* Test requirements.

## What should not exist after Phase 18

* A god `InvestigationPipeline` with hard-coded phases.
* Multiple canonical orchestrators.
* Bundle serializers that create conclusions.
* Validation objects without replay result lineage.
* Knowledge records without provenance.
* Plugin outputs that mutate canonical evidence.
* Unversioned public DTO changes.
* Architecture documents without executable conformance checks.

## Operating modes

### Deterministic fixture mode

Used for tests and research reproducibility. All clocks, identities, evidence inputs, and target responses are controlled.

### Live investigation mode

Used against real targets under safety policy. Outputs include environment instability and reproducibility metadata.

### Benchmark mode

Used for scientific evaluation. Runs pinned targets/corpora and produces metrics.

### Extension validation mode

Used to test plugins/rule packs against authority and determinism requirements.

## Long-term architectural outcome

After Phase 18, the repository should be capable of:

* Replaying browser-observed authorization hypotheses deterministically.
* Producing proof-backed findings with lineage.
* Planning investigations from evidence gaps.
* Preserving negative knowledge.
* Reasoning across investigations without replacing replay truth.
* Exporting deterministic evidence bundles for humans and AI systems.
* Supporting external analyzers and evidence sources without boundary erosion.
* Publishing empirical results with reproducible artifacts.

## Final target architecture opinion

The strongest future architecture is not “more AI” and not “more browser automation.” It is deterministic, replay-backed security investigation with scientific evaluation. AI can consume bundles and assist humans, but it should not become an authority over evidence, validation, or conclusions.
