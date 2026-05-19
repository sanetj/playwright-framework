# ADR: Replay Contracts & Determinism

## Status
Accepted

## Canonical Authority
`src/intelligence/workflow/workflow-replay.ts` and replay contract types in `src/intelligence/kernel/replay-contracts.ts`.

## Decision
Replay is semantic-transition-based, not selector-position-based.

## Replay Contract Requirements
- Deterministic sequence over canonical event ordering
- State lineage awareness (`beforeState`, `afterState`)
- Transition integrity checks
- Drift detection under partial telemetry
- Confidence scoring output

## Determinism Guarantees
- Ordering: (`ts`, `seq`)
- Duplicate suppression in chain reconstruction
- Lineage fallback: `causeTraceId` -> last event in session

## Governance Constraints
- Replay remains policy-constrained and readonly-first by default.
- No autonomous mutation execution.

## Merge-Safe Guidance
- Replay contract shape should evolve additively.
- Versioned assumptions belong in replay contracts, not scattered analyzers.
