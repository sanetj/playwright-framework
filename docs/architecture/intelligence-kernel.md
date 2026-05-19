# ADR: Intelligence Kernel Ownership

## Status
Accepted

## Canonical Authority
`src/intelligence/kernel/intelligence-kernel.ts`

## Decision
Introduce a single coordination authority for semantic pipeline lifecycle.

## Kernel Responsibilities
- Analyzer registration
- Pipeline ordering
- Confidence propagation
- Signal-governance integration
- Workflow/replay/graph coordination

## Non-Responsibilities
- Runtime capture internals
- Playwright orchestration internals
- Export formatting mutations

## Dependency Direction
Runtime capture -> canonical events -> kernel orchestration -> semantic artifacts -> export

## Merge-Safe Guidance
- Kernel APIs should remain stable and additive.
- Existing orchestrators can wrap kernel incrementally.
