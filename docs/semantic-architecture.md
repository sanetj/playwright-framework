# Semantic Architecture Contract

## Canonical Terminology
- **interaction**: a contiguous user/runtime operation chain identified by `chainId`.
- **action**: an explicit interaction event (`click`, `input`, `form_submit`) that may trigger transitions.
- **transition**: a state or route change between two observable runtime conditions.
- **state**: a SPA runtime condition represented by a state signature (`beforeState`/`afterState`).
- **signature**: deterministic state fingerprint generated from runtime/UI features.
- **route**: normalized URL path context (`route.path`) at event time.
- **workflow**: ordered transition/action sequence over one or more interactions.
- **graph edge**: directional relation between nodes with typed semantics (`triggers`, `mutates`, `unlocks`, `transitions_to`, `authenticates`, `escalates`, `depends_on`).

## Event Lifecycle
1. `captured` - emitted by runtime instrumentation.
2. `normalized` - canonical type and routing fields assigned.
3. `deduplicated` - duplicate fingerprints suppressed.
4. `grouped` - interaction chain grouping applied.
5. `replay_ready` - chain validated for deterministic replay.

## Telemetry Tier Contract
- **CRITICAL**: security-impactful and auth-critical signals (`runtime_exception`, `console_error`, `csp_violation`, `auth_change`).
- **WORKFLOW**: interaction-driving events (`click`, `input`, `form_submit`, route/modal transitions).
- **STRUCTURAL**: system behavior and communication (`navigation`, API request/response, websocket/SSE).
- **DEBUG**: high-volume diagnostics (`mutation`, storage/cookie/indexeddb operations).
- **NOISE**: residual low-value telemetry.

## Determinism Rules
- Event ordering is `ts` then `seq`.
- Per-session timestamps are monotonic (clamped forward).
- Event IDs are hash-derived from trace/session/type/path/time context.
- Parent lineage is trace-linked first, then session-last fallback.

## Convergence Hotspots
- Legacy overlap exists between `src/intel/core/intelligence/*` and `src/intelligence/*` event/graph/workflow modules.
- Canonical runtime intelligence should consume `src/intelligence/events/normalized-event.ts` contracts.
- Future convergence path: adapt legacy `src/intel/core/intelligence` readers via thin translation adapters to canonical event model.
