import { CanonicalHttpResponse } from './canonical-http-evidence';
import * as crypto from 'crypto';

export class ResponseFingerprinter {
  
  public generateFingerprint(response: CanonicalHttpResponse): string {
    const status = response.status.toString();
    const structuralHash = this.getStructuralHash(response.bodyStr);
    
    const payload = `${status}:${structuralHash}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Generates a hash representing the structural schema of the response,
   * ignoring dynamic data values.
   */
  private getStructuralHash(bodyStr?: string): string {
    if (!bodyStr) return 'empty';
    
    try {
      const obj = JSON.parse(bodyStr);
      const schemaString = this.extractSchema(obj);
      return crypto.createHash('md5').update(schemaString).digest('hex');
    } catch {
      // Non-JSON response, rely on length-bucketed hash for partial structural equivalence
      const bucketedLength = Math.floor(bodyStr.length / 50) * 50;
      return `raw_len_${bucketedLength}`;
    }
  }

  private extractSchema(obj: any): string {
    if (Array.isArray(obj)) {
      return `Array[${obj.length > 0 ? this.extractSchema(obj[0]) : 'empty'}]`;
    }
    
    if (obj !== null && typeof obj === 'object') {
      const keys = Object.keys(obj).sort();
      const schemaParts = keys.map(k => `${k}:${this.extractSchema(obj[k])}`);
      return `{${schemaParts.join(',')}}`;
    }
    
    return typeof obj;
  }
}
