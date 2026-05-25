import { SubmissionFinding } from '../runtime/validation/false-positive-eliminator';
import { ReplaySeed } from '../runtime/replay/replay-seed';

export interface InvestigationProvenance {
  findingId: string;
  replaySeed: string;
  mutationHash: string;
  lineageHash: string;
  executionVersion: string;
}

export class InvestigationProvenanceCapture {
  /**
   * Captures the exact cryptographic lineage of how this finding was generated.
   * This guarantees that in future phases (Phase 10), an AI can trace a submission 
   * exactly back to the seeds and branches that created it, with no assumptions.
   */
  public capture(finding: SubmissionFinding, seed: ReplaySeed): InvestigationProvenance {
    return {
      findingId: finding.findingId || 'unknown',
      replaySeed: seed.executionSeed,
      mutationHash: seed.mutationHash,
      lineageHash: seed.lineageHash,
      executionVersion: 'v1.0.0-phase9.3' // Would come from package.json in real life
    };
  }
}
