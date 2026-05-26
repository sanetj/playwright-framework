import { MinimalReplayRecipe } from '../runtime/replay/replay-minimizer';
import { CanonicalHttpExchange } from '../runtime/evidence/canonical-http-evidence';
import { SubmissionFinding } from '../runtime/validation/false-positive-eliminator';

export interface ReplayRecipeInstructions {
  humanReadableSteps: string[];
  curlCommand: string;
}

export class ReplayRecipeGenerator {
  /**
   * Generates step-by-step human readable instructions and an executable curl command
   * to instantly reproduce the exploit.
   */
  public generate(finding: SubmissionFinding, minimalRecipe: MinimalReplayRecipe): ReplayRecipeInstructions {
    const proof = finding.proofs[0];
    if (!proof) {
      return {
        humanReadableSteps: ['No exploit proof available.'],
        curlCommand: 'No curl command available.'
      };
    }

    const steps: string[] = [];
    
    // 1. Generate human readable steps
    steps.push(`1. Login as Role: ${finding.targetRole}`);
    
    let stepNumber = 2;
    for (let i = 0; i < minimalRecipe.minimalExchanges.length - 1; i++) {
      const ex = minimalRecipe.minimalExchanges[i];
      steps.push(`${stepNumber}. Navigate to / Intercept: ${ex.request.method} ${ex.request.url}`);
      stepNumber++;
    }

    const mutatedExchange = proof.originalExchange;
    steps.push(`${stepNumber}. Intercept: ${mutatedExchange.request.method} ${mutatedExchange.request.url}`);
    steps.push(`   Replace with payload injecting target ID/Role: ${finding.targetEntityId}`);
    steps.push(`   Expected Status: ${finding.baseStatus || 403}`);
    steps.push(`   Observed Status: ${proof.statusDelta.after}`);

    // 2. Generate the curl command for the mutated request
    const curlCommand = this.buildCurlCommand(mutatedExchange);

    return {
      humanReadableSteps: steps,
      curlCommand
    };
  }

  private buildCurlCommand(exchange: CanonicalHttpExchange): string {
    const req = exchange.request;
    let curl = `curl -X ${req.method} "${req.url}"`;
    
    if (req.headers) {
      for (const header of req.headers) {
        curl += ` -H "${header.name}: ${header.value.replace(/"/g, '\\"')}"`;
      }
    }
    
    if (req.bodyStr) {
      // Very naive escaping for bash
      const escapedData = req.bodyStr.replace(/'/g, "'\\''");
      curl += ` -d '${escapedData}'`;
    }
    
    return curl;
  }
}
