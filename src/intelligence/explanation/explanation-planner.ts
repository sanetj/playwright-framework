import { PrioritizedCandidate } from '../scoring/candidate-scoring-contracts';
import { InvestigationAttackGraph } from '../graphs/attack-graph-contracts';
import { ConsistencyReport } from '../consistency/consistency-contracts';
import { StructuralNoveltyReport } from '../novelty/novelty-contracts';
import { EvidenceSufficiencyReport } from '../sufficiency/sufficiency-contracts';
import { ExplanationPlan, ExplanationStep } from './explanation-contracts';

/**
 * @architecture_authority Explanation Planner
 * @responsibility Constructs a deterministic dependency graph dictating the canonical sequence of explanation.
 * @determinism Purely sequential linking of available intelligence. No text generation.
 */
export class ExplanationPlanner {

  public plan(
    investigationId: string,
    candidates: PrioritizedCandidate[],
    graphs: InvestigationAttackGraph[],
    consistencyReports: ConsistencyReport[],
    noveltyReports: StructuralNoveltyReport[],
    sufficiencyReports: EvidenceSufficiencyReport[]
  ): ExplanationPlan {
    
    const orderedSteps: ExplanationStep[] = [];
    
    // 1. REPLAY_FOUNDATION (Base Step)
    const foundationId = `step_${this.simpleHash('foundation_' + investigationId)}`;
    orderedSteps.push({
      stepIdentity: foundationId,
      category: 'REPLAY_FOUNDATION',
      referencedIds: [investigationId],
      dependsOn: []
    });

    // 2. CANDIDATE_INTRODUCTION
    const candidateStepIds: string[] = [];
    for (const cand of candidates) {
      const stepId = `step_${this.simpleHash('cand_' + cand.candidateIdentity)}`;
      orderedSteps.push({
        stepIdentity: stepId,
        category: 'CANDIDATE_INTRODUCTION',
        referencedIds: [cand.candidateIdentity],
        dependsOn: [foundationId]
      });
      candidateStepIds.push(stepId);
    }

    // 3. ATTACK_PROGRESSION
    const graphStepIds: string[] = [];
    for (const graph of graphs) {
      const stepId = `step_${this.simpleHash('graph_' + graph.graphIdentity)}`;
      orderedSteps.push({
        stepIdentity: stepId,
        category: 'ATTACK_PROGRESSION',
        referencedIds: [graph.graphIdentity],
        dependsOn: candidateStepIds.length > 0 ? [...candidateStepIds] : [foundationId]
      });
      graphStepIds.push(stepId);
    }

    // 4. CONSISTENCY_REVIEW
    const consistencyStepIds: string[] = [];
    for (const report of consistencyReports) {
      const stepId = `step_${this.simpleHash('consist_' + report.graphIdentity)}`;
      orderedSteps.push({
        stepIdentity: stepId,
        category: 'CONSISTENCY_REVIEW',
        referencedIds: [report.graphIdentity],
        dependsOn: graphStepIds.length > 0 ? [...graphStepIds] : candidateStepIds
      });
      consistencyStepIds.push(stepId);
    }

    // 5. NOVELTY_OBSERVATION
    const noveltyStepIds: string[] = [];
    for (const report of noveltyReports) {
      const stepId = `step_${this.simpleHash('novel_' + report.reportIdentity)}`;
      orderedSteps.push({
        stepIdentity: stepId,
        category: 'NOVELTY_OBSERVATION',
        referencedIds: [report.reportIdentity],
        dependsOn: consistencyStepIds.length > 0 ? [...consistencyStepIds] : graphStepIds
      });
      noveltyStepIds.push(stepId);
    }

    // 6. SUFFICIENCY_ASSESSMENT
    const sufficiencyStepIds: string[] = [];
    for (const report of sufficiencyReports) {
      const stepId = `step_${this.simpleHash('suff_' + report.reportIdentity)}`;
      orderedSteps.push({
        stepIdentity: stepId,
        category: 'SUFFICIENCY_ASSESSMENT',
        referencedIds: [report.reportIdentity],
        dependsOn: noveltyStepIds.length > 0 ? [...noveltyStepIds] : consistencyStepIds
      });
      sufficiencyStepIds.push(stepId);
    }

    // 7. FINAL_SUMMARY
    const conclusionId = `step_${this.simpleHash('summary_' + investigationId)}`;
    orderedSteps.push({
      stepIdentity: conclusionId,
      category: 'FINAL_SUMMARY',
      referencedIds: [investigationId],
      dependsOn: sufficiencyStepIds.length > 0 ? [...sufficiencyStepIds] : noveltyStepIds
    });

    return {
      planIdentity: `plan_${this.simpleHash('plan_seq_' + investigationId)}`,
      investigationId,
      orderedSteps
    };
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
