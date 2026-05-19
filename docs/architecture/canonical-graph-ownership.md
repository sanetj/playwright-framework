# ADR: Canonical Graph Ownership

## Status
Accepted

## Canonical Authority
`src/intelligence/graph/action-graph.ts`, `graph-builder.ts`, `graph-query-engine.ts`.

## Decision
- Canonical semantic graph taxonomy lives under `src/intelligence/graph/*`.
- `src/intel/core/intelligence/action-graph.ts` is compatibility-facing and should be treated as a projection adapter.

## Canonical Node Taxonomy
- route
- action
- api
- state
- auth-state
- semantic-entity

## Canonical Edge Taxonomy
- triggers
- mutates
- unlocks
- transitions_to
- authenticates
- escalates
- depends_on

## Graph Lifecycle
1. Construct from canonical events
2. Deduplicate nodes/edges
3. Enrich with semantic/trust metadata
4. Query/projection
5. Serialize deterministically

## Confidence Semantics
- Edge confidence is derived from: event lineage quality + repetition + state-transition consistency.
- Projection graphs may down-convert semantics but must not invent new edge vocabularies.

## Merge-Safe Guidance
- Add new edge kinds only in canonical graph taxonomy docs + code together.
- Adapters must map to canonical kinds, never fork naming.
