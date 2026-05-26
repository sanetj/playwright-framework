/**
 * @canonical
 * Investigation Exporter Contracts
 * Exports deterministic investigation bundles into multiple AI-optimized formats.
 */

import { InvestigationBundle } from '../artifacts/investigation-bundle';

export type ExportFormat = 'JSON' | 'MARKDOWN' | 'HACKERONE_MD' | 'BUGCROWD_MD' | 'AI_CONTEXT_DUMP' | 'COMPRESSED_EVIDENCE';

export interface MarkdownExportOptions {
  includeScreenshots: boolean;
  includeRawHttp: boolean;
  includeLineageHashes: boolean;
}

export interface BundleExporter {
  exporterId: string;
  supportedFormats: ExportFormat[];
  export(bundle: InvestigationBundle, format: ExportFormat, options?: MarkdownExportOptions): Promise<string>;
}
