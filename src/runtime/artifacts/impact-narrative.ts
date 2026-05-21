export class ImpactNarrativeBuilder {
  /**
   * Explains the impact of the exploit, clearly delineating the broken privilege boundary.
   */
  public buildImpact(
    baseRole: string,
    compRole: string,
    method: string,
    url: string,
    isDestructive: boolean,
    isSensitiveObject: boolean
  ): string {
    let impact = `### Privilege Boundary Violation\n\n`;
    impact += `The system relies on an authorization boundary to separate the capabilities of \`${baseRole}\` and \`${compRole}\`.\n`;
    impact += `By replaying this request, an attacker with the \`${compRole}\` role is able to successfully execute \`${method} ${url}\` against a resource owned by or restricted to \`${baseRole}\`.\n\n`;

    impact += `### Business Impact\n\n`;
    if (isDestructive) {
      impact += `**CRITICAL DESTRUCTIVE IMPACT**: The attacker can permanently delete or modify resources they do not own, leading to data loss and severe integrity violations.\n`;
    } else if (isSensitiveObject) {
      impact += `**HIGH CONFIDENTIALITY IMPACT**: The attacker gains unauthorized read access to sensitive PII, financial, or administrative data, leading to a direct confidentiality breach.\n`;
    } else {
      impact += `**AUTHORIZATION BYPASS**: The attacker can manipulate application state or access records outside of their intended tenant boundary.\n`;
    }

    return impact;
  }
}
