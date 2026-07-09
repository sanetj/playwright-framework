# Architectural Gap Analysis for the Next Repository Level

## Executive conclusion

The next architectural level is not blocked by missing feature count. It is blocked by proof integrity, determinism, lifecycle enforcement, boundary enforcement, and scientific validation. The current implementation is capable enough to investigate browser security behavior, but its authority model is still too easy to violate.

This document distinguishes:

* **Verified observations** — directly visible in implementation structure.
* **Strong inferences** — consequences strongly implied by implementation.
* **Architectural opinions** — recommendations based on long-term platform design.

## Gap 1 — Determinism is local, not lifecycle-wide

### Verified observations

Several analyzers sort their outputs and create stable identities. Candidate synthesis, prioritization, attack graph construction, consistency analysis, novelty analysis, sufficiency analysis, and explanation planning show deterministic intent.

The runtime lifecycle still includes wall-clock identifiers, generated timestamps, event-order-sensitive exchange IDs, and live browser/network timing.

### Strong inference

Identical semantic inputs can produce different bundles or evidence metadata if runtime timing, event arrival order, or generation time differs.

### Why it blocks the next level

Future memory, benchmarking, and research claims require reproducible artifacts. If determinism is not end-to-end, cross-investigation reasoning and empirical evaluation will be contaminated.

### Required remediation

* Inject deterministic clock into investigation IDs, replay snapshots, evidence timestamps, and bundle generation.
* Replace sequence-sensitive identity with canonical content-addressed identity where possible.
* Canonicalize headers, body hashes, URLs, and graph serialization.
* Add byte-identical golden tests for derived artifacts.

## Gap 2 — Validation result model is underpowered

### Verified observations

Replay validation can return supported findings through `ExploitValidationEngine`, but orchestration can represent failed validation by casting partial objects into validation-shaped findings.

### Strong inference

Downstream consumers can receive invalid or incomplete validation-shaped objects and treat them as structurally equivalent to proof-backed validation results.

### Why it blocks the next level

The doctrine says evidence exceeds conclusions and validation never manufactures evidence. This doctrine requires a result algebra that cannot represent unsupported conclusions as proof-bearing facts.

### Required remediation

* Define a closed validation result union.
* Make proof-bearing supported findings structurally distinct from rejected/inconclusive/invalid results.
* Require all result variants to include reason, replay attempt lineage, and evidence references.
* Update candidate synthesis to consume only appropriate validation variants.

## Gap 3 — Orchestration authority is split

### Verified observations

The repository contains an `IntelligenceKernel`, architecture documents describing canonical authorities, and a concrete `InvestigationPipeline` that is the actual end-to-end execution path.

### Strong inference

Future contributors may extend the kernel while the active investigation pipeline bypasses it, or they may extend the pipeline while violating documented kernel doctrine.

### Why it blocks the next level

Planning, memory, and plugins require a single extension model. Split orchestration authority causes duplicate implementations and inconsistent outputs.

### Required remediation

Choose one:

1. Make the kernel the stage registry for investigation execution.
2. Declare `InvestigationPipeline` the canonical orchestrator and demote the kernel to a local analyzer runner.

Do not keep both as canonical.

## Gap 4 — Concrete infrastructure leaks into orchestration

### Verified observations

The active investigation pipeline imports concrete Playwright runtime, concrete crawler, concrete interceptors, validation pipeline, analyzers, and compressor.

### Strong inference

Swapping runtime implementations, running deterministic fixture mode, or supporting HAR/proxy/CDP sources will require invasive pipeline changes.

### Why it blocks the next level

Research evaluation, alternate evidence sources, and extension systems require dependency inversion.

### Required remediation

* Introduce interfaces for runtime, evidence capture, crawl/exploration, validation, stage execution, and bundle projection.
* Move concrete Playwright classes behind adapters.
* Add static boundary tests that reject forbidden imports.

## Gap 5 — Investigation context is not runtime-immutable

### Verified observations

Context exposes readonly arrays through getters but returns underlying arrays. Lifecycle mutation methods block changes after completion/bundling, but external references can still observe or mutate arrays if type safety is bypassed.

### Strong inference

A downstream consumer can corrupt investigation state after completion, especially in JavaScript runtime or through casts.

### Why it blocks the next level

Planning, memory, benchmarking, and bundle projection require snapshot integrity.

### Required remediation

* Return frozen copies or immutable collection wrappers.
* Add snapshot objects distinct from mutable active context.
* Add mutation-after-completion tests using runtime casts.

## Gap 6 — Cleanup and failure semantics are incomplete

### Verified observations

The pipeline terminates runtime at the end of the happy path. It does not wrap the full lifecycle in a top-level cleanup guarantee.

### Strong inference

Exceptions during crawl, validation, analysis, or compression can leave browser sessions/resources alive.

### Why it blocks the next level

A long-running investigation platform cannot leak browser contexts or corrupt subsequent investigations.

### Required remediation

* Use top-level `try/finally` for runtime termination.
* Add cancellation semantics.
* Define recoverable vs fatal errors.
* Emit lifecycle failure state.

## Gap 7 — Evidence reference integrity is not globally enforced

### Verified observations

Context stores evidence exchange IDs and bundle compression filters exchanges by required IDs. Sufficiency analysis checks candidate arrays, but not global reference resolution against canonical evidence.

### Strong inference

Derived artifacts can reference evidence IDs that are missing from exported evidence or runtime evidence inventory.

### Why it blocks the next level

Evidence lineage is the core claim. Broken references undermine replay-backed investigation.

### Required remediation

* Add an evidence reference resolver.
* Make bundle creation fail or mark incomplete when referenced evidence is missing.
* Add tests for orphan candidates, orphan graph nodes, orphan proof lineage, and redacted evidence references.

## Gap 8 — Confidence is fragmented

### Verified observations

Confidence appears in validation, proof semantics, scoring, evidence, reproducibility, novelty-like reasoning, and sufficiency, but there is no central confidence algebra.

### Strong inference

Scores and confidence labels can become incomparable across subsystems.

### Why it blocks the next level

Planning and research evaluation need confidence semantics that compose.

### Required remediation

* Define confidence dimensions: evidence quality, replay stability, semantic match, environment stability, ownership certainty, graph support.
* Define legal composition rules.
* Require confidence explanations for validation and prioritization.

## Gap 9 — Negative knowledge is missing

### Verified observations

The system can reject or fail validations, but there is no first-class model for what was tried and disproven.

### Strong inference

Future planners may retry unproductive paths or treat absence of findings as absence of risk.

### Why it blocks the next level

Investigation planning requires knowing what not to do again and why.

### Required remediation

* Add negative knowledge records for failed replay, invalid replay, insufficient evidence, suppressed false positives, and exhausted frontier entries.
* Keep negative knowledge separate from canonical evidence.

## Gap 10 — Exploration foundations are not integrated with investigation sufficiency

### Verified observations

Exploration-related modules exist, but the Phase 12 pipeline is single-pass crawl/validate/analyze/bundle.

### Strong inference

Future autonomous exploration could run independently of evidence sufficiency, causing unbounded or irrelevant exploration.

### Why it blocks the next level

Exploration should be driven by investigation gaps, not generic crawling.

### Required remediation

* Introduce sufficiency-driven frontier creation.
* Add deterministic scheduling and budgets.
* Require every frontier item to cite the gap that produced it.

## Gap 11 — Public extension boundaries are premature

### Verified observations

The codebase already has many conceptual seams: runtime, evidence, replay, analyzers, bundle exporters, governance. But enforcement is weak.

### Strong inference

Adding plugins now would let extensions mutate or bypass canonical truth.

### Why it blocks the next level

A platform cannot safely expose extension points before authority boundaries are executable.

### Required remediation

Delay plugins until Phase 18. First harden deterministic identity, validation algebra, governance, and public DTO versioning.

## Gap 12 — Tests validate functionality more than architectural invariants

### Verified observations

There are unit, integration, validation, workflow-analysis, and resource-analysis tests. They demonstrate many paths work, but architectural invariants such as byte-identical output, forbidden imports, immutable context, and orphan evidence detection are not comprehensively enforced.

### Strong inference

Future refactors can silently violate doctrine while tests remain green.

### Why it blocks the next level

Architecture claims must become regression tests.

### Required remediation

* Add architecture tests for dependency boundaries.
* Add determinism snapshot tests.
* Add negative validation shape tests.
* Add context immutability tests.
* Add evidence reference integrity tests.
* Add cleanup-on-error tests.

## Prioritized gap closure plan

### Immediate

1. Deterministic clock/identity/serialization.
2. Validation result union.
3. Context snapshot immutability.
4. Pipeline cleanup guarantee.
5. Static boundary checks.

### Near-term

1. Replay strategy selection.
2. Evidence reference resolver.
3. Confidence algebra.
4. Negative knowledge.
5. Sufficiency-driven planning.

### Later

1. Knowledge state.
2. Multi-investigation reasoning.
3. Benchmark harness.
4. Extension/plugin contracts.

## Final gap assessment

The repository is not blocked by lack of imagination. It is blocked by insufficient enforcement of its own doctrines. The next architectural level requires turning doctrine into code-level impossibility, not adding another layer of analysis.
