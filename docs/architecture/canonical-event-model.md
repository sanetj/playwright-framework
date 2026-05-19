# ADR: Canonical Event Model

## Status
Accepted

## Canonical Authority
`src/intelligence/events/normalized-event.ts` and `src/intelligence/events/normalized-event-bus.ts`.

## Decision
- `NormalizedEvent` is the canonical runtime event contract.
- `NormalizedEventBus` is the canonical normalization + lineage + ordering authority.
- `src/intel/core/intelligence/normalized-event-bus.ts` is an adapter/compatibility layer, not a primary ontology.

## Required Canonical Fields
- Deterministic `id`
- Monotonic/replay-safe ordering (`ts`, `seq`)
- Causality (`parentEventId`, `causes`, `chainId`)
- Runtime context (`route`, `actor`, `beforeState`, `afterState`)
- Tiering and lifecycle (`tier`, `lifecycle`)

## Event Tier Contract
- `CRITICAL`, `WORKFLOW`, `INTERACTION`, `STRUCTURAL`, `DIAGNOSTIC`, `NOISE`

## Compatibility Rules
- Legacy/compat systems must translate into canonical events at boundaries.
- No new event roots are allowed.
- New analyzers consume canonical events only.

## Merge-Safe Guidance
- Additive contract evolution only.
- Avoid field renames; prefer optional additive fields + explicit version notes.
