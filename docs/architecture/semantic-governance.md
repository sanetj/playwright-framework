# ADR: Semantic Governance

## Status
Accepted

## Canonical Authorities by Concern
| Concern | Canonical Authority |
|---|---|
| Event lineage | `src/intelligence/events/normalized-event-bus.ts` |
| Replay contracts | `src/intelligence/kernel/replay-contracts.ts` + `src/intelligence/workflow/workflow-replay.ts` |
| Workflow transitions | `src/intelligence/workflow/workflow-engine.ts` |
| Semantic graph | `src/intelligence/graph/*` |
| Runtime orchestration | `src/runtime/instrumentation/*` (capture), `src/intelligence/kernel/intelligence-kernel.ts` (semantic orchestration) |
| Signal governance | `src/intelligence/governance/signal-governance.ts` |
| Trust boundaries | `src/intelligence/trust/trust-boundary-engine.ts` |

## Governance Rules
- One canonical owner per concern.
- Legacy systems may project/translate, but cannot redefine canonical vocabulary.
- All new semantic analyzers must declare source event tier dependencies.
- Confidence propagation must be explicit in analyzer outputs.

## Deprecation Semantics
- Mark duplicate systems as `adapter` or `deprecated_candidate` in architecture manifest.
- Deprecation is staged; no destructive removal in merge-heavy phases.
