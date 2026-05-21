# The Runtime Constitution (Canonical Authorities)

This document defines the **Canonical Authorities** for the Browser Runtime Intelligence Platform. 

To maintain a coherent runtime intelligence operating system and prevent semantic drift or parallel sub-systems, all new implementations MUST adhere to the following ownership boundaries.

| Concern | Canonical Authority | Legacy / Adapter Path |
|----------|--------------------|------------------------|
| **Runtime events** | `src/intelligence/events/normalized-event-bus.ts` | `src/intel/core/intelligence/normalized-event-bus.ts` |
| **Replay contracts** | `src/intelligence/kernel/replay-contracts.ts` | Interaction-based replay |
| **Workflow transitions** | `src/intelligence/workflow/workflow-engine.ts` | `src/intel/core/workflow/workflow.inference.ts` |
| **Semantic graph** | `src/intelligence/graph/action-graph.ts` | `src/intel/core/intelligence/action-graph.ts` |
| **Runtime orchestration** | `src/intelligence/kernel/intelligence-kernel.ts` | Ad-hoc orchestrators |
| **Signal governance** | `src/intelligence/governance/signal-governance.ts` | Raw telemetry pipelines |
| **Semantic inference** | `src/intelligence/semantic/semantic-api-analyzer.ts`| `src/intel/core/intelligence/semantic-api-analyzer.ts` |
| **Trust analysis** | `src/intelligence/trust/trust-boundary-engine.ts` | `src/intel/core/intelligence/trust-boundary-engine.ts` |
| **AI export pipeline** | `src/intel/core/export/ai.exporter.ts` | *N/A* (Adapts to kernel) |

## Key Architectural Directives

1. **SEARCH EXISTING SYSTEMS FIRST:** Do not build new foundational infrastructure without checking the authorities above.
2. **EXTEND BEFORE CREATING:** If an abstraction is missing, extend the canonical authority rather than creating a competing system.
3. **PRESERVE IMPORT COMPATIBILITY:** Use adapters to bridge legacy integrations into canonical authorities. This allows "Accept Incoming Changes" merges to survive without brittle refactoring.
4. **DO NOT CREATE NEW ROOT SYSTEMS:** The `IntelligenceKernel` is the sole orchestrator. All analyzers MUST register into it.
5. **DO NOT CREATE NEW EVENT UNIVERSES:** The `CanonicalRuntimeEvent` is the definitive telemetry contract. Legacy events MUST funnel into the normalized event bus.
6. **MARK CANONICAL SYSTEMS EXPLICITLY:** Use JSDoc `@canonical` tags.
7. **MARK LEGACY SYSTEMS EXPLICITLY:** Use JSDoc `@deprecated Legacy Subsystem` tags for files in `src/intel/core/intelligence/`.
