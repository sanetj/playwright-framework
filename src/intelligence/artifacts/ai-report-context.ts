/**
 * @canonical
 * AI Report Context Contracts
 * Generate optimized AI-uploadable context for LLMs to draft polished bug bounty reports.
 */

import { OptimizedAiContext } from './ai-context-optimization';
import { ReportNarrative } from './report-mapping';

export interface AiReportPromptTemplate {
  templateId: string;
  systemPrompt: string;
  vulnerabilitySpecificInstructions: string;
  expectedOutputFormat: 'MARKDOWN' | 'JSON' | 'HACKERONE_SPEC';
}

export interface AiReportContextPayload {
  payloadId: string;
  targetProfileId: string;
  optimizedTelemetryContext: OptimizedAiContext;
  preMappedNarrative: ReportNarrative;
  recommendedPromptTemplate: AiReportPromptTemplate;
  generatedAtTs: number;
}
