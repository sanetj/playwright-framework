export type InvestigationStatus = 'CREATED' | 'COLLECTING_EVIDENCE' | 'AWAITING_VALIDATION' | 'VALIDATING' | 'COMPLETED' | 'BUNDLED';
import { PrioritizedCandidate } from '../scoring/candidate-scoring-contracts';
import { InvestigationAttackGraph } from '../graphs/attack-graph-contracts';
import { ConsistencyReport } from '../consistency/consistency-contracts';
import { StructuralNoveltyReport } from '../novelty/novelty-contracts';
import { EvidenceSufficiencyReport } from '../sufficiency/sufficiency-contracts';
import { ExplanationPlan } from '../explanation/explanation-contracts';

/**
 * @architecture_authority Investigation Context
 * @responsibility Owns the context, progression, and completion state of an active investigation.
 * @invariants
 * - Investigation cannot exist without origin context.
 * - Investigation cannot modify Evidence or Replay truth.
 * - Investigation consumes completed Validations.
 * @determinism Perfect deterministic traversal. Identical evidence + validations yield identical contexts.
 */
export interface IInvestigationContext {
  readonly investigationId: string;
  status: InvestigationStatus;
  
  // Investigation Context Preservation: Reference, rather than duplicate, evidence.
  readonly evidenceExchangeIds: readonly string[];
  readonly validatedFindingIds: readonly string[];
  readonly prioritizedCandidates: readonly PrioritizedCandidate[]; // Replaces raw investigationCandidates
  readonly attackGraphs: readonly InvestigationAttackGraph[];
  readonly consistencyReports: readonly ConsistencyReport[];
  readonly noveltyReports: readonly StructuralNoveltyReport[];
  readonly sufficiencyReports: readonly EvidenceSufficiencyReport[];
  readonly explanationPlans: readonly ExplanationPlan[];
  readonly targetUrl: string;

  // Evolution
  transitionTo(status: InvestigationStatus): void;
  attachEvidence(exchangeId: string): void;
  attachValidation(findingId: string): void;
  attachPrioritizedCandidates(candidates: PrioritizedCandidate[]): void;
  attachAttackGraphs(graphs: InvestigationAttackGraph[]): void;
  attachConsistencyReports(reports: ConsistencyReport[]): void;
  attachNoveltyReports(reports: StructuralNoveltyReport[]): void;
  attachSufficiencyReports(reports: EvidenceSufficiencyReport[]): void;
  attachExplanationPlans(plans: ExplanationPlan[]): void;
}

export class DefaultInvestigationContext implements IInvestigationContext {
  private readonly _evidenceExchangeIds: string[] = [];
  private readonly _validatedFindingIds: string[] = [];
  private _prioritizedCandidates: PrioritizedCandidate[] = [];
  private _attackGraphs: InvestigationAttackGraph[] = [];
  private _consistencyReports: ConsistencyReport[] = [];
  private _noveltyReports: StructuralNoveltyReport[] = [];
  private _sufficiencyReports: EvidenceSufficiencyReport[] = [];
  private _explanationPlans: ExplanationPlan[] = [];

  constructor(
    public readonly investigationId: string,
    public readonly targetUrl: string,
    public status: InvestigationStatus = 'CREATED'
  ) {}

  get evidenceExchangeIds(): readonly string[] {
    return this._evidenceExchangeIds;
  }

  get validatedFindingIds(): readonly string[] {
    return this._validatedFindingIds;
  }

  get prioritizedCandidates(): readonly PrioritizedCandidate[] {
    return this._prioritizedCandidates;
  }

  get attackGraphs(): readonly InvestigationAttackGraph[] {
    return this._attackGraphs;
  }

  get consistencyReports(): readonly ConsistencyReport[] {
    return this._consistencyReports;
  }

  get noveltyReports(): readonly StructuralNoveltyReport[] {
    return this._noveltyReports;
  }

  get sufficiencyReports(): readonly EvidenceSufficiencyReport[] {
    return this._sufficiencyReports;
  }

  get explanationPlans(): readonly ExplanationPlan[] {
    return this._explanationPlans;
  }

  private assertNotFrozen(): void {
    if (this.status === 'COMPLETED' || this.status === 'BUNDLED') {
      throw new Error('Architectural Invariant Violation: Cannot modify InvestigationContext after it has been COMPLETED or BUNDLED.');
    }
  }

  public transitionTo(newStatus: InvestigationStatus): void {
    if ((this.status === 'COMPLETED' || this.status === 'BUNDLED') && newStatus !== 'BUNDLED') {
       throw new Error('Architectural Invariant Violation: Cannot transition InvestigationContext backwards after completion.');
    }
    console.log(`[Investigation ${this.investigationId}] Transitioning: ${this.status} -> ${newStatus}`);
    this.status = newStatus;
  }

  public attachEvidence(exchangeId: string): void {
    this.assertNotFrozen();
    this._evidenceExchangeIds.push(exchangeId);
  }

  public attachValidation(findingId: string): void {
    this.assertNotFrozen();
    this._validatedFindingIds.push(findingId);
  }

  public attachPrioritizedCandidates(candidates: PrioritizedCandidate[]): void {
    this.assertNotFrozen();
    this._prioritizedCandidates = [...candidates];
  }

  public attachAttackGraphs(graphs: InvestigationAttackGraph[]): void {
    this.assertNotFrozen();
    this._attackGraphs = [...graphs];
  }

  public attachConsistencyReports(reports: ConsistencyReport[]): void {
    this.assertNotFrozen();
    this._consistencyReports = [...reports];
  }

  public attachNoveltyReports(reports: StructuralNoveltyReport[]): void {
    this.assertNotFrozen();
    this._noveltyReports = [...reports];
  }

  public attachSufficiencyReports(reports: EvidenceSufficiencyReport[]): void {
    this.assertNotFrozen();
    this._sufficiencyReports = [...reports];
  }

  public attachExplanationPlans(plans: ExplanationPlan[]): void {
    this.assertNotFrozen();
    this._explanationPlans = [...plans];
  }
}
