import { InvestigationProvenance } from './investigation-provenance';
import * as crypto from 'crypto';

export interface BundleManifest {
  findingId: string;
  executionVersion: string;
  replaySeed: string;
  bundleVersion: string;
  generatedArtifacts: string[];
  checksums: Record<string, string>;
}

export class BundleManifestGenerator {
  /**
   * Generates a manifest.json representing the entire submission bundle.
   * By cryptographically sealing the generated artifacts, Phase 10 AI ingestion 
   * can perfectly trust and reconstruct the finding without assumptions.
   */
  public generate(
    provenance: InvestigationProvenance, 
    files: Record<string, string | Buffer>
  ): BundleManifest {
    
    const generatedArtifacts = Object.keys(files);
    const checksums: Record<string, string> = {};

    for (const [filename, content] of Object.entries(files)) {
      checksums[filename] = crypto.createHash('sha256').update(content).digest('hex');
    }

    return {
      findingId: provenance.findingId,
      executionVersion: provenance.executionVersion,
      replaySeed: provenance.replaySeed,
      bundleVersion: '1.0.0', // Standard bundle schema version
      generatedArtifacts,
      checksums
    };
  }
}
