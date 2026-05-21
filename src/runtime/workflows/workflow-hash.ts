import { CanonicalHttpExchange } from '../evidence/canonical-http-evidence';
import { RequestFingerprinter } from '../evidence/request-fingerprint';
import * as crypto from 'crypto';

export class WorkflowHasher {
  private reqFingerprinter = new RequestFingerprinter();

  /**
   * Hashes a sequence of exchanges to identify equivalent workflow executions.
   * This is used to deduplicate semantic paths and prevent replay explosion.
   */
  public hashWorkflow(exchanges: CanonicalHttpExchange[]): string {
    if (exchanges.length === 0) return 'empty_workflow';

    // A workflow's identity is the ordered sequence of its request fingerprints
    const sequence = exchanges.map(ex => this.reqFingerprinter.generateFingerprint(ex.request));
    const payload = sequence.join('->');
    
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}
