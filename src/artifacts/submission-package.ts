import { SubmissionReadiness } from './submission-readiness';
import { BundleManifest } from './bundle-manifest';
import { ExportEvidenceBundle } from '../runtime/evidence/evidence-redactor';
import * as fs from 'fs';
import * as path from 'path';

export class SubmissionPackageExport {
  /**
   * Generates the final structured submission package for bug bounty triage.
   * If readiness is false, it aggressively blocks export to prevent incomplete submissions.
   */
  public async exportPackage(
    readiness: SubmissionReadiness,
    manifest: BundleManifest,
    narrative: string,
    evidence: ExportEvidenceBundle,
    pocScript: string,
    outputDir: string
  ): Promise<string> {
    
    if (!readiness.ready) {
      throw new Error(`[SubmissionPackageExport] Blocked: Package is not ready for submission. Reason: ${readiness.blockReason}`);
    }

    // 1. Create output directory structure
    const bundlePath = path.join(outputDir, `bundle_${manifest.findingId}`);
    const evidencePath = path.join(bundlePath, 'evidence');
    
    fs.mkdirSync(evidencePath, { recursive: true });

    // 2. Write narrative (Report)
    fs.writeFileSync(path.join(bundlePath, 'report.md'), narrative, 'utf-8');

    // 3. Write Executable PoC
    const pocPath = path.join(bundlePath, 'poc.sh');
    fs.writeFileSync(pocPath, pocScript, 'utf-8');
    fs.chmodSync(pocPath, 0o755); // Make executable

    // 4. Write Evidence (Sanitized)
    fs.writeFileSync(
      path.join(evidencePath, 'redacted-exchanges.json'), 
      JSON.stringify(evidence.redactedExchanges, null, 2), 
      'utf-8'
    );

    // 5. Write self-describing Manifest
    fs.writeFileSync(
      path.join(bundlePath, 'manifest.json'), 
      JSON.stringify(manifest, null, 2), 
      'utf-8'
    );

    // In a real system we would zip this folder
    return bundlePath;
  }
}
