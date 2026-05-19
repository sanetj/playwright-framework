# Semantic Architecture Contract (Phase 5)

## Canonical Ownership
- Canonical event ontology, telemetry routing, and lineage contracts are owned by `src/intelligence/events/*`.
- `src/intel/core/intelligence/*` is a compatibility consumer surface and should converge to canonical contracts incrementally.

## Core Terms
- **Runtime Observation**: Raw captured browser/runtime signal.
- **Canonical Event**: Immutable normalized observation with deterministic identity (`id`), ordering (`ts`,`seq`), lineage (`parentEventId`,`chainId`), and tier.
- **Interaction**: Contiguous behavior chain represented by `chainId`.
- **Transition**: State/route change linking `beforeState` and `afterState`.
- **Workflow**: Ordered transition/action sequence inferred from canonical events.
- **Replay Chain**: Deduplicated deterministic step list reconstructed from workflow and event lineage.
- **Graph Node/Edge**: Stable semantic relationship artifacts derived from canonical events.
- **Trust Boundary**: Role/auth/capability boundary where governance policy applies.

## Event Lifecycle (Append-only)
`captured -> normalized -> deduplicated -> grouped -> replay_ready`

## Telemetry Tiers
- `CRITICAL`: auth/security/stability-risk signals
- `WORKFLOW`: route/modal transition signals
- `INTERACTION`: user/runtime action signals
- `STRUCTURAL`: navigation/network/streaming structure signals
- `DIAGNOSTIC`: high-volume instrumentation signals
- `NOISE`: low-value residual signals

## Dependency Direction
Runtime Capture -> Canonical Events -> State/Graph/Semantic Inference -> Replay Reconstruction -> Export/Summarization

Rules:
- Runtime collects only.
- Semantic layers infer only.
- Replay reconstructs only.
- Export summarizes only.

## Replay Assumptions
- Replay is state-transition-oriented, not selector-coordinates-oriented.
- Ordering is deterministic by (`ts`,`seq`) with monotonic per-session timestamp clamping.
- Duplicate transitions should be suppressed before replay scoring.
- Partial telemetry is tolerated by lineage fallbacks (`trace parent` then `session last event`).

## Graph Assumptions
- Node IDs are normalized before insertion and lookup.
- Edge identity is deterministic by (`from`,`kind`,`to`,`layer`).
- Duplicate edge evidence must be deduplicated.
- Serialized graph output must be deterministically ordered.

## Convergence Roadmap
1. Adopt canonical `src/intelligence/events` contracts at ingestion boundaries.
2. Keep `src/intel/core/intelligence` adapters thin and read-only.
3. Migrate workflow/graph/replay consumers to canonical event chain semantics.
4. Deprecate duplicate event ontologies once all consumers are migrated.

## Duplication Hotspots
- `src/intel/core/intelligence/normalized-event-bus.ts` vs `src/intelligence/events/normalized-event-bus.ts`
- `src/intel/core/intelligence/action-graph.ts` vs `src/intelligence/graph/action-graph.ts`
- `src/intel/core/intelligence/workflow-engine.ts` vs `src/intelligence/workflow/workflow-engine.ts`

Canonical direction remains toward `src/intelligence/*` as semantic system-of-record.
