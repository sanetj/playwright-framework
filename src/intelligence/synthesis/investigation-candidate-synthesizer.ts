import { ValidatedFinding } from '../../runtime/validation/exploit-validation-engine';
import { InvestigationCandidate } from './investigation-candidate-model';
import { OwnershipInventory } from '../resource-analysis/ownership-intelligence';

/**
 * @architecture_authority Candidate Synthesis Engine
 * @responsibility Deterministically groups ValidatedFindings into InvestigationCandidates without fabricating logic.
 * @determinism Pure grouping algorithm based on identical targetEntityIds and finding types.
 */
export class InvestigationCandidateSynthesizer {
  
  /**
   * Deterministically groups and deduplicates validated findings into Candidates.
   */
  public synthesize(
      findings: ValidatedFinding[], 
      baseRole: string, 
      comparisonRole: string, 
      ownershipInventory: OwnershipInventory
  ): InvestigationCandidate[] {
    const groups: Map<string, ValidatedFinding[]> = new Map();

    // 1. Candidate Assembly (Grouping Rule: Target Entity ID + Finding Type + Roles)
    for (const finding of findings) {
      const groupKey = `${finding.type}|${finding.targetEntityId}|${baseRole}|${comparisonRole}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(finding);
    }

    const candidates: InvestigationCandidate[] = [];

    // 2. Candidate Identity Generation & Deduplication
    for (const [key, groupFindings] of groups.entries()) {
      // Sort to guarantee determinism
      groupFindings.sort((a, b) => (a.findingId || 'unknown').localeCompare(b.findingId || 'unknown'));
      
      const findingIds = groupFindings.map(f => f.findingId || 'unknown');
      
      const evidenceExchangeIds = new Set<string>();
      for (const finding of groupFindings) {
        if (finding.proofs) {
          for (const proof of finding.proofs) {
             if (proof.originalExchange) {
                 evidenceExchangeIds.add(proof.originalExchange.exchangeId.id);
             }
          }
        }
      }
      const sortedEvidenceIds = Array.from(evidenceExchangeIds).sort();

      // Ownership Context Association
      const targetEntityId = groupFindings[0].targetEntityId || 'unknown';
      const ownershipRefs: string[] = [];
      
      for (const obs of ownershipInventory.observations) {
          if (evidenceExchangeIds.has(obs.baselineExchangeId)) {
              ownershipRefs.push(obs.observationId);
          }
      }
      const sortedOwnershipRefs = Array.from(new Set(ownershipRefs)).sort();

      // Deterministic Identity: "cand_hash(type|target|baseRole|compRole|findingIds)"
      // For simplicity and debuggability in this engine, we generate a deterministic string hash.
      const identityMaterial = `${key}|${findingIds.join(',')}`;
      const candidateIdentity = `cand_${this.simpleHash(identityMaterial)}`;

      candidates.push({
        candidateIdentity,
        lifecycle: 'READY_FOR_SCORING', // Has passed synthesis and correlation
        validatedFindingIds: findingIds,
        evidenceExchangeIds: sortedEvidenceIds,
        baseRoleContext: baseRole,
        comparisonRoleContext: comparisonRole,
        ownershipReferences: sortedOwnershipRefs,
        targetEntityId: targetEntityId,
        candidateType: groupFindings[0].type,
        supportingSignals: [] // Reserved for future workflow/auth signals
      });
    }

    // Sort candidates for deterministic ordering
    candidates.sort((a, b) => a.candidateIdentity.localeCompare(b.candidateIdentity));

    return candidates;
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
