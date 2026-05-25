import * as crypto from 'crypto';

export interface RuntimeExchangeId {
  id: string;
  requestFingerprint: string;
  navigationId: string;
  frameId?: string;
  sequenceNumber: number;
}

export class RuntimeExchangeIdGenerator {
  private sequenceCounter = 0;

  public generate(
    method: string,
    normalizedUrl: string,
    requestBodyFingerprint: string,
    navigationId: string,
    frameId?: string
  ): RuntimeExchangeId {
    this.sequenceCounter++;
    
    const hash = crypto.createHash('sha256');
    hash.update(method);
    hash.update(normalizedUrl);
    hash.update(requestBodyFingerprint);
    hash.update(navigationId);
    hash.update(this.sequenceCounter.toString());

    return {
      id: `rxid_${hash.digest('hex').substring(0, 16)}`,
      requestFingerprint: requestBodyFingerprint,
      navigationId,
      frameId,
      sequenceNumber: this.sequenceCounter
    };
  }
}
