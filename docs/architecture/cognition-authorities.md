# Cognition Authorities & Semantic Ownership Boundaries

To prevent ontology fragmentation and parallel runtime pipelines, the following boundaries strictly define the ownership of semantic primitives and runtime components within the cognition platform.

## Canonical Authorities

| Domain | Authority Path | Responsibility |
|--------|---------------|----------------|
| **Ontology** | `src/intelligence/ontology/*` | Exclusively for lightweight semantic primitives, contracts, enums, and shared types. **No orchestration or execution logic allowed here.** |
| **Events** | `src/intelligence/events/normalized-event-bus.ts` | The sole truth for telemetry, normalization, and actor association. **No alternate event buses permitted.** |
| **Graph** | `src/intelligence/graph/action-graph.ts` | The canonical semantic graph for the runtime. **No alternate graph systems permitted.** |
| **State** | `src/intelligence/state/role-session-manager.ts` | The definitive authority for tracking auth state, tenant context, and session lineage. **Duplicate session ownership is forbidden.** |
| **Lineage** | `src/intelligence/ontology/entity-lineage.ts` | The foundational contract for object-ownership tracking and entity propagation across requests. |
| **Exploration** | `src/intelligence/exploration/contracts/frontier.ts` | Defines the frontier of known-but-unexplored states. Must interact with the canonical ActionGraph. |
| **Governance** | `src/intelligence/governance/policy-engine.ts` | Policy evaluation, intent classification, and dry-run planning. Must respect the centralized architecture manifest. |
| **Replay** | `src/intelligence/kernel/replay-contracts.ts` | Preserves deterministic replay compatibility and session reconstruction. |

## Architectural Constraints
- **Preserve Compatibility:** All extensions must maintain backward compatibility with the existing `NormalizedEvent` structure and `ActorContext`.
- **Extend, Don't Replace:** When a new capability is needed, augment the existing authority (e.g., adding to the `NormalizedEventBus`) rather than building a parallel subsystem.
- **Strict Separation of Contracts:** Contracts live in `ontology/` or specific `contracts/` directories. Implementations live in the domain-specific directories (`events/`, `graph/`, `state/`).
