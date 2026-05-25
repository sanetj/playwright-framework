import * as crypto from 'crypto';

export interface ReplaySeed {
  sessionHash: string;
  lineageHash: string;
  mutationHash: string;
  executionSeed: string; // The base seed derived from the above
}

export class DeterministicIdGenerator {
  private seed: ReplaySeed;
  private executionCounter: number = 0;

  constructor(seed: ReplaySeed) {
    this.seed = seed;
  }

  /**
   * Generates a deterministic ID based on the ReplaySeed and a counter.
   * This guarantees that for a given session, lineage, and mutation,
   * the exact same IDs are generated in the exact same order every time.
   */
  public generateId(prefix: string): string {
    this.executionCounter++;
    
    // Create a deterministic hash combining the seed and the counter
    const hashInput = `${this.seed.executionSeed}_${prefix}_${this.executionCounter}`;
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
    
    return `${prefix}_${hash}`;
  }

  /**
   * Factory method to create a ReplaySeed from its constituent parts.
   */
  public static createSeed(sessionHash: string, lineageHash: string, mutationHash: string): ReplaySeed {
    const executionSeed = crypto
      .createHash('sha256')
      .update(`${sessionHash}_${lineageHash}_${mutationHash}`)
      .digest('hex');

    return {
      sessionHash,
      lineageHash,
      mutationHash,
      executionSeed
    };
  }
}
