# Semantic Architecture Contract (Canonical)

## 1) Canonical Terms
- **Runtime Observation**: Raw browser-captured signal before normalization.
- **Event**: Immutable normalized observation with deterministic identity and lineage.
- **Action**: User/runtime operation event (`click`, `input`, `form_submit`, `file_upload`).
- **Interaction**: Ordered event chain (`chainId`) describing one contiguous behavior slice.
- **Transition**: Explicit state/route change between `beforeState` and `afterState`.
- **Workflow**: Multi-transition interaction pattern inferred from grouped events.
- **Replay Chain**: Deterministic, deduplicated step sequence reconstructed from workflow/event lineage.
- **State Signature**: Deterministic fingerprint of SPA-visible runtime state.
- **State Mutation**: Event that changes state signature or trust-relevant runtime context.
- **Semantic Entity**: Business-domain resource inferred from API/event semantics.
- **Graph Node**: Stable identity representation of route/action/state/api/entity.
- **Graph Edge**: Deterministic relation (`triggers`, `mutates`, `unlocks`, `transitions_to`, `authenticates`, `escalates`, `depends_on`).
- **Trust Boundary**: Role/auth/privilege enforcement surface where incorrect assumptions can create security exposure.

## 2) Dependency Direction (Mandatory)
Runtime Capture -> Event Normalization -> State/Graph/Semantic Inference -> Replay Reconstruction -> Export/Summarization.

Rules:
- Runtime layers **collect only**.
- Semantic layers **infer only**.
- Replay layers **reconstruct only**.
- Export layers **summarize only**.
- Semantic layers must not import Playwright runtime internals.
- Replay must not own runtime capture logic.

## 3) Event Lifecycle (Append-Only)
1. `captured`
2. `normalized`
3. `deduplicated`
4. `grouped`
5. `replay_ready`

Normalized events are immutable snapshots. Lifecycle progression is append-only.

## 4) Event Stability Guarantees
- Deterministic event id from trace/session/type/path/time tuple.
- Replay-safe ordering by `(ts, seq)`.
- Per-session monotonic timestamp clamping.
- Parent lineage resolution: trace parent first, then session fallback.
- Duplicate suppression via deterministic event fingerprints.

## 5) Telemetry Tier Contract
- **CRITICAL**: auth/security/stability critical (`auth_change`, `runtime_exception`, `console_error`, `csp_violation`).
- **WORKFLOW**: route/modal transition signals.
- **INTERACTION**: actionable user/runtime input operations.
- **STRUCTURAL**: navigation/network/streaming shape signals.
- **DIAGNOSTIC**: high-volume debug telemetry (mutation/storage/cookie/indexeddb).
- **NOISE**: residual low-value events.

## 6) Graph Assumptions
- Node identity is normalized and stable.
- Edge identity is deterministic by `(from, kind, to, layer)`.
- Self-loop transitions are suppressed by default.
- Edge evidence is deduplicated.
- Graph serialization ordering is deterministic for replay/export stability.

## 7) Replay Assumptions
- Replay operates over normalized state transitions, not selectors.
- Replay chains must suppress adjacent duplicate steps.
- Replay scoring should penalize hidden/non-deterministic transitions.

## 8) Duplication Hotspots & Convergence Direction
Hotspots:
- `src/intel/core/intelligence/*`
- `src/intelligence/*`

Canonical direction:
- Canonical semantic contracts and event-spine ownership live under `src/intelligence/*`.
- Legacy `src/intel/core/intelligence/*` should progressively consume canonical contracts (translation only where needed).
