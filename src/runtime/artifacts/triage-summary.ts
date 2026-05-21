import { DifferentialConfidenceScore } from '../differential/differential-confidence';
import { FindingPriorityLevel } from '../differential/finding-priority';

export class TriageSummaryGenerator {
  /**
   * Generates a high-signal, zero-fluff triage summary optimized for Bug Bounty triagers.
   */
  public generate(
    title: string,
    priority: FindingPriorityLevel,
    confidence: DifferentialConfidenceScore,
    targetUrl: string,
    description: string
  ): string {
    let summary = `## Bug Bounty Triage Summary\n\n`;
    
    summary += `**Vulnerability**: ${title}\n`;
    summary += `**Priority / Severity**: ${priority} (${confidence.severity})\n`;
    summary += `**Target**: \`${targetUrl}\`\n\n`;

    summary += `### Executive Summary\n`;
    summary += `${description}\n\n`;

    summary += `### Key Evidence Signals (Why this is valid)\n`;
    for (const factor of confidence.factors) {
      summary += `- ✅ ${factor}\n`;
    }

    return summary;
  }
}
