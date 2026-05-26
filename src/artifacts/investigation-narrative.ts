import { SubmissionFinding } from '../runtime/validation/false-positive-eliminator';
import { ReplayRecipeInstructions } from './replay-recipe-generator';

export class InvestigationNarrativeGenerator {
  /**
   * Generates a factual, hallucination-free markdown narrative suitable for a bug bounty report.
   */
  public generate(finding: SubmissionFinding, recipe: ReplayRecipeInstructions): string {
    const proof = finding.proofs[0];
    if (!proof) {
      return 'Validated finding contains no exploit proof.';
    }

    return `
# Vulnerability Report: ${finding.type.replace(/_CANDIDATE/g, '')} on ${proof.originalExchange.request.url}

## Finding Summary
${finding.description}

## Observed Behavior
When sending a mutated request, the server returned an HTTP **${proof.statusDelta.after}** response and generated replay evidence classified as **${proof.classification}** with confidence **${proof.confidence}**.

## Expected Behavior
The server should have rejected the request with an HTTP **${finding.baseStatus || 403}** (Forbidden) or 401 (Unauthorized).

## Reproduction Steps

${recipe.humanReadableSteps.join('\n')}

### cURL Proof-of-Concept
\`\`\`bash
${recipe.curlCommand}
\`\`\`

## Proof Chain / Evidence
- **Original Exchange ID:** ${proof.originalExchange.exchangeId.id}
- **Validation Confidence:** ${proof.confidence}
- **Reproducibility Score:** ${(finding.reproducibilityScore * 100).toFixed(0)}% (Verified via Triager Simulation)
    `.trim();
  }
}
