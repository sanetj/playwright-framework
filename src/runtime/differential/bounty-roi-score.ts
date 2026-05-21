export class BountyRoiScorer {
  /**
   * Calculates an economic ROI score for a finding based on likely bounty payouts.
   * Higher score = higher priority for human triage.
   */
  public calculateRoiScore(
    method: string,
    url: string,
    authAsymmetry: boolean,
    isDestructive: boolean,
    isSensitiveObject: boolean
  ): number {
    let score = 10; // Base score

    // Write operations generally pay higher than Read operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      score += 20;
    }

    if (isDestructive && method.toUpperCase() === 'DELETE') {
      score += 30; // Destructive IDORs/BACs are critical
    }

    if (authAsymmetry) {
      score += 25; // Vertical privilege escalation pays well
    }

    if (isSensitiveObject) {
      score += 15; // e.g. /api/users, /api/payments vs /api/preferences
    }

    // Maximum theoretical score is 100 for this heuristic
    return Math.min(score, 100);
  }

  public isSensitive(url: string): boolean {
    const sensitiveKeywords = ['user', 'admin', 'payment', 'billing', 'secret', 'password', 'key', 'token', 'auth'];
    const urlLower = url.toLowerCase();
    return sensitiveKeywords.some(kw => urlLower.includes(kw));
  }
}
