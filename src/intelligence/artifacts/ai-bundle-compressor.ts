import { CanonicalHttpExchange } from '../../runtime/evidence/canonical-http-evidence';
import { LineageExtractionResult } from '../../runtime/instrumentation/entity-lineage-extractor';
import { ExportProfileManager, ExportProfileMode } from '../../runtime/artifacts/export-profile';
import { BundleRedactor } from '../../runtime/artifacts/bundle-redaction';
import { OwnershipLink } from '../ontology/entity-lineage';
import { OwnershipInventory } from '../resource-analysis/ownership-intelligence';

import { DefaultInvestigationContext } from '../orchestration/investigation-context';
import { PrioritizedCandidate } from '../scoring/candidate-scoring-contracts';
import { InvestigationAttackGraph } from '../graphs/attack-graph-contracts';
import { ConsistencyReport } from '../consistency/consistency-contracts';
import { StructuralNoveltyReport } from '../novelty/novelty-contracts';
import { EvidenceSufficiencyReport } from '../sufficiency/sufficiency-contracts';
import { ExplanationPlan } from '../explanation/explanation-contracts';

/**
 * @architecture_authority Bundle Representation & Projection
 * @invariants
 * - The Bundle owns representational format and projection mapping only.
 * - Every exported evidence item MUST maintain a traceable RuntimeExchangeId pointing to its Playwright origin.
 * - External systems MUST NOT mutate the bundle payload in memory.
 * - Projection NEVER generates intelligence, scoring, or conclusions.
 */
export interface InvestigationBundle {
  readonly targetDomain: string;
  readonly generatedAt: string;
  readonly exportMode: string;
  readonly investigationId: string;
  
  // Projected Phase 12 Intelligence
  readonly prioritizedCandidates: readonly PrioritizedCandidate[];
  readonly attackGraphs: readonly InvestigationAttackGraph[];
  readonly consistencyReports: readonly ConsistencyReport[];
  readonly noveltyReports: readonly StructuralNoveltyReport[];
  readonly sufficiencyReports: readonly EvidenceSufficiencyReport[];
  readonly explanationPlans: readonly ExplanationPlan[];

  // Base Topologies & Raw Evidence
  readonly evidenceExchanges: readonly any[];
  readonly lineage: readonly LineageExtractionResult[];
  readonly ownershipLinks?: readonly OwnershipLink[];
  readonly ownershipInventory?: OwnershipInventory;
}

/**
 * @architecture_authority Export & Bundle Serialization
 * @responsibility Maps and projects the canonical InvestigationContext into a deterministic artifact without performing analytical generation.
 * @allowed_dependencies Graph (DTOs), Evidence (DTOs), Redaction Utilities, Context (Readonly)
 * @forbidden_dependencies Playwright, Execution Pipeline, Live Intelligence Analysis
 * @determinism Strict (Array identity and sorting enforces byte-identical bundles)
 */
export class AiBundleCompressor {
  
  public compress(
    domain: string,
    context: DefaultInvestigationContext,
    exchanges: CanonicalHttpExchange[],
    lineageData: LineageExtractionResult[],
    exportMode: ExportProfileMode = ExportProfileMode.CONCISE_AI,
    ownershipLinks: OwnershipLink[] = [],
    ownershipInventory?: OwnershipInventory
  ): InvestigationBundle {
    
    // === Bundle Lifecycle Stage 1: Evidence Redaction & Formatting ===
    // This is pure Representation processing. We are redacting PII, not calculating intelligence.
    const profileManager = new ExportProfileManager();
    const config = profileManager.getConfig(exportMode);
    const redactor = new BundleRedactor();

    // Only export exchanges that are explicitly referenced by the intelligence Context
    const requiredExchangeIds = new Set<string>();
    
    // Aggregate IDs referenced by candidates
    for (const cand of context.prioritizedCandidates) {
      for (const id of cand.evidenceExchangeIds) {
        requiredExchangeIds.add(id);
      }
    }
    
    // Always include any explicitly attached generic evidence from early lifecycle
    for (const id of context.evidenceExchangeIds) {
      requiredExchangeIds.add(id);
    }

    // Format and redact the raw evidence DTOs deterministically
    const compressedExchanges = exchanges
      .filter(ex => requiredExchangeIds.has(ex.exchangeId.id))
      .map(ex => redactor.redactExchange(ex, config))
      .sort((a, b) => a.exchangeId.id.localeCompare(b.exchangeId.id));


    // === Bundle Lifecycle Stage 2: Canonical Intelligence Projection ===
    // We deterministically project the immutable InvestigationContext arrays directly into the Bundle DTO.
    // We strictly map arrays by value copy.
    // We intentionally omit execution metadata (status, transitions) to prevent orchestration leakage.
    return {
      targetDomain: domain,
      generatedAt: new Date().toISOString(),
      exportMode,
      investigationId: context.investigationId,
      
      // Intelligence Projection (Pure DTO mapping)
      prioritizedCandidates: [...context.prioritizedCandidates],
      attackGraphs: [...context.attackGraphs],
      consistencyReports: [...context.consistencyReports],
      noveltyReports: [...context.noveltyReports],
      sufficiencyReports: [...context.sufficiencyReports],
      explanationPlans: [...context.explanationPlans],

      // Base Topology & Raw Evidence
      evidenceExchanges: compressedExchanges,
      lineage: lineageData,
      ownershipLinks,
      ownershipInventory
    };
  }
}
