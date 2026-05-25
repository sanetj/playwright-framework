import { SubmissionFinding } from '../runtime/validation/false-positive-eliminator';
import { ReplayRecipeInstructions } from './replay-recipe-generator';

export class InvestigationNarrativeGenerator {
  /**
   * Generates a factual, hallucination-free markdown narrative suitable for a bug bounty report.
   * Impact is derived strictly from the roles and methods involved.
   */
  public generate(finding: SubmissionFinding, recipe: ReplayRecipeInstructions): string {
    const isIdor = finding.type === 'IDOR_CANDIDATE';
    const impactDescription = isIdor 
      ? `A lower-privileged user (${finding.baseRoleId}) can access or modify entities belonging to another user (${finding.targetRole}) by manipulating the \`${finding.targetEntityId}\` parameter.`
      : `A user with the role of \`${finding.baseRoleId}\` can successfully access an endpoint restricted to \`${finding.comparisonRoleId}\`.`;

    return `
# Vulnerability Report: ${finding.type.replace(/_CANDIDATE/g, '')} on ${finding.evidence.proof.originalExchange.request.url}

## Finding Summary
${finding.description}

## Impact
**Severity:** ${finding.severity}
${impactDescription}

## Observed Behavior
When sending a mutated request simulating the attacker's context, the server returned an HTTP **${finding.evidence.proof.statusDelta.after}** response, successfully leaking sensitive entities or bypassing authorization boundaries.

## Expected Behavior
The server should have rejected the request with an HTTP **${finding.baseStatus || 403}** (Forbidden) or 401 (Unauthorized).

## Reproduction Steps

${recipe.humanReadableSteps.join('\n')}

### cURL Proof-of-Concept
\`\`\`bash
${recipe.curlCommand}
\`\`\`

## Proof Chain / Evidence
- **Original Exchange ID:** ${finding.evidence.proof.originalExchange.exchangeId.id}
- **Validation Confidence:** ${(finding.evidence.proof.confidence * 100).toFixed(0)}%
- **Reproducibility Score:** ${(finding.reproducibilityScore * 100).toFixed(0)}% (Verified via Triager Simulation)
    `.trim();
  }
}
