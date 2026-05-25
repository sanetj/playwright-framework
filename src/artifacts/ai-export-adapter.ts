import * as fs from 'fs';
import * as path from 'path';

/**
 * Versioned schema standard for evidence bundles.
 * Guarantees future AI models can ingest the findings.
 */
export interface EvidenceBundleV1 {
  version: 'bundle-v1.json';
  manifest: any;
  graphSummary: any;
  differentialEvidence: any;
  timelineRef: string;
  pocRef: string;
}

/**
 * AI Isolation Layer.
 * Packages deterministic artifacts for external AI consumption.
 * Zero LLM APIs are invoked within the runtime boundary.
 */
export class AiExportAdapter {
  
  public exportBundle(
    bundleId: string,
    manifestData: any,
    graphData: any,
    differentialData: any,
    timelineMarkdown: string,
    pocScript: string,
    outputDir: string
  ): string {
    const bundlePath = path.join(outputDir, `ai_bundle_${bundleId}`);
    fs.mkdirSync(bundlePath, { recursive: true });

    // Write text/script artifacts
    const timelineFile = 'timeline.md';
    const pocFile = 'poc.sh';
    fs.writeFileSync(path.join(bundlePath, timelineFile), timelineMarkdown, 'utf-8');
    fs.writeFileSync(path.join(bundlePath, pocFile), pocScript, 'utf-8');

    // Create the versioned JSON schema
    const bundleJson: EvidenceBundleV1 = {
      version: 'bundle-v1.json',
      manifest: manifestData,
      graphSummary: graphData,
      differentialEvidence: differentialData,
      timelineRef: timelineFile,
      pocRef: pocFile
    };

    const jsonFile = 'bundle-v1.json';
    fs.writeFileSync(path.join(bundlePath, jsonFile), JSON.stringify(bundleJson, null, 2), 'utf-8');

    console.log(`[AiExportAdapter] Successfully packaged Evidence Bundle V1 for external AI analysis at: ${bundlePath}`);
    return bundlePath;
  }
}
