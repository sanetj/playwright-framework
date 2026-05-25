import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';

export class ReproNarrativeBuilder {
  /**
   * Generates a concise reproduction narrative detailing the exact steps to exploit a vulnerability.
   */
  public buildNarrative(baseExchanges: CanonicalHttpExchange[], compExchange: CanonicalHttpExchange): string {
    let narrative = "### Reproduction Steps\n\n";
    narrative += "1. Authenticate as the victim (Base Role) and establish session context.\n";
    
    // Add prerequisites if there are preceding exchanges in the workflow
    if (baseExchanges.length > 1) {
      narrative += "2. Perform the following prerequisite actions to setup the state:\n";
      for (let i = 0; i < baseExchanges.length - 1; i++) {
        const ex = baseExchanges[i];
        narrative += `   - \`${ex.request.method} ${ex.request.url}\`\n`;
      }
    }

    narrative += `\n3. Observe the final restricted action as the victim:\n`;
    const targetEx = baseExchanges[baseExchanges.length - 1];
    narrative += `   - \`${targetEx.request.method} ${targetEx.request.url}\` (Returns ${targetEx.response?.status ?? 'unknown'})\n`;

    narrative += `\n4. Authenticate as the attacker (Comparison Role).\n`;
    narrative += `5. Replay the exact restricted request using the attacker's authorization headers:\n`;
    narrative += `   - \`${compExchange.request.method} ${compExchange.request.url}\`\n`;
    narrative += `6. Observe the successful exploitation (Returns ${compExchange.response?.status ?? 'unknown'}).\n`;

    return narrative;
  }
}
