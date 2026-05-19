# ADR: Subsystem Ownership & Migration Direction

## Status
Accepted

## Ownership Matrix
- `src/runtime/*`: runtime capture and instrumentation only
- `src/intelligence/events/*`: canonical event ontology and normalization
- `src/intelligence/graph/*`: canonical semantic graph
- `src/intelligence/workflow/*`: canonical workflow + replay semantics
- `src/intelligence/semantic/*`: canonical semantic API/entity inference
- `src/intelligence/trust/*`: canonical trust-boundary inference
- `src/intelligence/governance/*`: canonical signal governance
- `src/intel/core/intelligence/*`: compatibility projections and migration facades

## Migration Direction
1. Ensure ingestion boundaries emit canonical events.
2. Keep `src/intel/core/intelligence/*` read-compatible adapters.
3. Move orchestration to kernel contracts gradually.
4. Mark duplicate logic as adapter/deprecation candidates in manifest.

## Conflict-Resilient Rules
- Never add a second canonical root.
- Add adapters instead of parallel engines.
- Preserve old interfaces while redirecting internals to canonical authorities.
