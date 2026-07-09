# Research Opportunities, Experiments, Benchmarks, and Evaluation Methodology

## Research positioning

The implementation is evolving toward a browser security investigation and intelligence platform. Its research value is not conventional Playwright automation. The interesting research question is whether browser-observed behavior can be converted into replay-validated, evidence-backed, ownership-aware security investigations that are deterministic enough for scientific evaluation and useful enough for real-world vulnerability discovery.

## Differentiated research themes

## Theme 1 — Replay-backed browser authorization investigation

### Core idea

Use observed browser/runtime HTTP exchanges as canonical evidence, synthesize authorization hypotheses, and validate them through controlled replay under alternate roles or mutated identifiers.

### Why it appears differentiated

Traditional browser automation frameworks assert UI behavior. Security scanners crawl and fuzz. This implementation connects browser-observed workflow evidence to replay-backed authorization validation and investigation artifacts.

### Research questions

* Can passive browser evidence produce high-quality authorization hypotheses?
* How often does replay validation confirm hypotheses compared with conventional endpoint scanning?
* What types of authorization bugs are discoverable only through browser-context evidence?
* How stable are replay findings across browsers, sessions, and time?

### Experiments

1. Run the framework against controlled vulnerable applications with known IDOR/BAC/tenant isolation flaws.
2. Compare hypotheses generated from browser evidence against endpoint-only crawling.
3. Measure validation precision and recall.
4. Measure replay stability over repeated runs.
5. Compare browser-context replay and HTTP-only replay.

### Metrics

* Hypothesis precision.
* Hypothesis recall.
* Validation precision.
* Validation recall.
* False positive rate.
* False negative rate.
* Replay success rate.
* Replay stability across runs.
* Time-to-first-valid-finding.

### Publishability

High if evaluated rigorously across benchmark targets and compared against baseline scanners or test frameworks.

## Theme 2 — Ownership-aware replay prioritization

### Core idea

Infer ownership relationships from evidence and prioritize replay candidates based on ownership mismatch, cross-role access, tenant boundaries, and authorization intent.

### Why it appears differentiated

Many tools identify identifiers and endpoints. Fewer reason explicitly about resource ownership relationships derived from browser traffic and use that reasoning to prioritize replay validation.

### Research questions

* Does ownership inference improve prioritization quality?
* Does ownership-aware prioritization reduce validation cost?
* Which ownership signals are most predictive of real authorization defects?
* How often do ownership heuristics mislead validation?

### Experiments

1. Generate candidates with and without ownership multipliers.
2. Measure ranking position of true positives.
3. Ablate ownership signal categories.
4. Evaluate across single-tenant, multi-tenant, and role-based applications.

### Metrics

* Mean reciprocal rank of true findings.
* Precision at K.
* Validation attempts saved.
* Ownership inference accuracy.
* Candidate priority calibration.

### Publishability

Medium to high. The idea becomes publishable if ownership inference is formalized and empirically validated.

## Theme 3 — Evidence sufficiency as investigation stopping and planning criterion

### Core idea

Use sufficiency reports to determine whether an investigation has enough evidence, whether more replay is needed, or whether exploration should continue.

### Why it appears differentiated

Most automation and scanning systems stop by budget, timeout, or coverage. This implementation has a natural sufficiency layer that can become a principled stopping criterion.

### Research questions

* Can evidence sufficiency predict whether additional exploration will find new valid findings?
* Can sufficiency reduce unnecessary replay attempts?
* Which sufficiency dimensions correlate with human triage acceptance?
* Can sufficiency guide exploration frontier selection better than coverage-only strategies?

### Experiments

1. Compare sufficiency-driven stopping to time-budget stopping.
2. Compare sufficiency-driven frontier selection to random or coverage-based exploration.
3. Ask human security reviewers to rate bundles with varying sufficiency states.
4. Measure investigation cost vs confirmed findings.

### Metrics

* Findings per replay attempt.
* Findings per minute.
* Human acceptance rate.
* Manual clarification requests.
* Additional value after sufficiency threshold.

### Publishability

High if framed as evidence sufficiency for automated security investigation.

## Theme 4 — Structural novelty in attack graph triage

### Core idea

Build attack graphs from validated candidates and identify structurally unusual patterns such as dense authorization nexuses or perfectly consistent multi-step chains.

### Why it appears differentiated

Attack graphs are common in security research, but deriving them from browser-observed, replay-validated authorization candidates is less common.

### Research questions

* Do structural novelty signals correlate with bug severity or bounty value?
* Do novelty observations help human triagers focus on complex exploit chains?
* Are graph-topological features useful beyond simple priority scores?

### Experiments

1. Generate attack graphs across benchmark vulnerable targets.
2. Compare novelty-ranked findings to severity labels.
3. Conduct human triage studies with and without novelty annotations.
4. Evaluate whether novelty discovers multi-step issues missed by endpoint-level scoring.

### Metrics

* Severity correlation.
* Triage time reduction.
* Human ranking agreement.
* Novelty precision.
* Exploit-chain discovery rate.

### Publishability

Medium. Current rules are simple; publishability improves with richer graph theory and empirical evidence.

## Theme 5 — Deterministic AI investigation bundles

### Core idea

Project replay-backed evidence, lineage, candidates, graphs, sufficiency, and explanation plans into deterministic bundles for human and AI-assisted analysis.

### Why it appears differentiated

AI-assisted security workflows often lack reproducible evidence packets. This repository can create bundles that separate evidence, conclusions, reasoning order, and representation.

### Research questions

* Do deterministic bundles improve LLM-assisted vulnerability analysis quality?
* Does explicit explanation planning reduce hallucinated reasoning?
* Can evidence-linked bundles improve human trust and reproducibility?
* What information should be included or redacted for optimal AI analysis?

### Experiments

1. Provide LLMs with raw logs vs structured bundles vs bundles with explanation plans.
2. Measure hallucinated claims, correct findings, missing evidence references, and report quality.
3. Evaluate deterministic bundle reproducibility.
4. Test redaction strategies and their impact on analysis quality.

### Metrics

* Hallucination rate.
* Evidence citation accuracy.
* Correct vulnerability classification.
* Report completeness.
* Reproducibility of AI outputs under fixed prompts.
* Token efficiency.

### Publishability

High if the evaluation is rigorous and artifacts are reproducible.

## Theme 6 — Negative knowledge for security investigation

### Core idea

Represent failed replays, invalid hypotheses, suppressed false positives, and exhausted exploration paths as first-class negative knowledge.

### Why it appears differentiated

Security tools often log failures but do not reason over them as knowledge. Investigation planners need to know what has already been disproven.

### Research questions

* Does negative knowledge reduce redundant replay attempts?
* Does it improve planner efficiency?
* How should invalid replay differ from rejected exploit hypothesis?
* Can negative knowledge improve human confidence in no-finding outcomes?

### Experiments

1. Run planning with and without negative knowledge memory.
2. Measure repeated attempts, wasted replays, and investigation time.
3. Evaluate correctness of no-finding conclusions on known-safe targets.

### Metrics

* Redundant action rate.
* Investigation runtime.
* No-finding confidence calibration.
* False negative rate.

### Publishability

Medium. Strong if combined with sufficiency-driven planning.

## Benchmark design

### Benchmark target categories

1. Controlled IDOR target.
2. Controlled broken access control target.
3. Controlled tenant isolation target.
4. Workflow-dependent authorization target.
5. State-dependent replay target.
6. Dynamic-token target.
7. Negative/safe target.
8. Chaotic/unstable target.
9. Multi-browser compatibility target.
10. Realistic benchmark such as Juice Shop-style application.

### Required benchmark properties

* Known ground truth.
* Reproducible deployment.
* Seeded users/roles/resources.
* Explicit ownership model.
* Known negative cases.
* Environment fingerprinting.
* Versioned fixtures.

### Benchmark outputs

* Captured canonical evidence.
* Replay attempts.
* Validation results.
* Candidate inventory.
* Attack graph.
* Sufficiency reports.
* Explanation plans.
* Bundle artifacts.
* Metrics report.

## Evaluation methodology

### Determinism evaluation

Run identical inputs multiple times under fixture mode and compare:

* Canonical exchanges.
* Candidate identities.
* Validation result identities.
* Attack graph identities.
* Sufficiency report identities.
* Bundle bytes.

Any differences must be classified as expected observed-runtime differences or framework nondeterminism.

### Validation accuracy evaluation

Use ground-truth vulnerable and safe cases. Measure:

* True positives.
* False positives.
* True negatives.
* False negatives.
* Inconclusive cases.
* Invalid replay cases.

Do not collapse inconclusive into false negative without separate reporting.

### Prioritization evaluation

Measure whether true high-severity findings rise to the top:

* Precision@1, @3, @5.
* Mean reciprocal rank.
* Normalized discounted cumulative gain.
* Attempts saved versus unprioritized replay.

### Planning evaluation

Compare planners:

* Random frontier.
* Coverage frontier.
* Priority-only frontier.
* Sufficiency-driven frontier.
* Negative-knowledge-aware frontier.

Measure findings per action and investigation time.

### Human evaluation

Have security reviewers compare bundles:

* Raw evidence only.
* Evidence plus candidates.
* Evidence plus graph/sufficiency/explanation plan.
* AI-generated narrative from bundle.

Measure triage time, confidence, correctness, and requested clarifications.

## Publication candidates

### Paper 1 — Replay-Backed Browser Authorization Investigation

Contribution: evidence-to-replay pipeline for browser-observed authorization bugs.

Needed before submission:

* Deterministic artifacts.
* Ground-truth benchmark.
* Scanner/framework comparison.
* Precision/recall evaluation.

### Paper 2 — Ownership-Aware Prioritization for Authorization Testing

Contribution: ownership inference improves replay candidate ranking.

Needed before submission:

* Formal ownership model.
* Ablation study.
* Multi-target evaluation.

### Paper 3 — Evidence Sufficiency for Automated Security Investigation

Contribution: sufficiency as a stopping and planning criterion.

Needed before submission:

* Sufficiency formalization.
* Planner integration.
* Cost-vs-findings evaluation.

### Paper 4 — Deterministic Evidence Bundles for AI-Assisted Security Triage

Contribution: structured, lineage-preserving AI context improves security analysis.

Needed before submission:

* Bundle determinism.
* LLM evaluation protocol.
* Human/AI comparison.

### Paper 5 — Negative Knowledge in Automated Security Investigation

Contribution: failed hypotheses as first-class planning knowledge.

Needed before submission:

* Negative knowledge model.
* Planner integration.
* Redundancy reduction results.

## Research risks

* Overclaiming novelty before empirical validation.
* Treating simple heuristics as research contributions.
* Failing to distinguish target nondeterminism from framework nondeterminism.
* Benchmark overfitting.
* LLM evaluation instability.
* Ethical concerns around autonomous security testing.

## Research ethics and safety

The platform should maintain target safety profiles, read-only replay modes, mutation risk classification, and explicit approval boundaries. Research benchmarks should use controlled targets or authorized environments. Any live-target research must record safety policy, mutation class, and approval state.

## Final research recommendation

The best research path is not to publish the current implementation as-is. The best path is:

1. Harden determinism and validation algebra.
2. Build benchmark targets and golden corpora.
3. Evaluate replay-backed authorization investigation.
4. Add sufficiency-driven planning and negative knowledge.
5. Evaluate AI bundle usefulness only after deterministic evidence packaging is reliable.

The repository has promising research ideas, but they become publishable only when converted from plausible architecture into measured claims.
