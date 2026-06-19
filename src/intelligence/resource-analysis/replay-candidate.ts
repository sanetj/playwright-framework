import { AuthorizationVector } from './authorization-vector';

export { AuthorizationVector };


export interface ReplayCandidate {
  /**
   * Deterministic unique ID format: "cand_${targetVector}_${resourceSignature}"
   * e.g., "cand_IDOR_GET::/rest/basket/:basketId"
   */
  readonly candidateId: string;
  readonly resourceFamily: string;
  readonly httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  readonly authorizationSurface: string;
  readonly targetVector: AuthorizationVector;

  /**
   * Deterministically selected CanonicalHttpExchange ID acting as the replay template baseline.
   */
  readonly baselineExchangeId: string;

  /**
   * Alphabetically sorted query or path parameter targets slated for mutation.
   */
  readonly parameterTargets: string[];

  /**
   * Alphabetically sorted header targets slated for credentials/cookies rotation.
   */
  readonly headerTargets: string[];

  /**
   * Lexicographically sorted reasons justifying this candidate synthesis.
   */
  readonly synthesisReasons: string[];

  /**
   * Ownership Intelligence Priority Multiplier (Phase 12.8)
   * Values:
   * 3.0x : Cross-owner candidate (High Priority)
   * 1.0x : Unknown / Public (Standard Priority)
   * 0.1x : Self-owner candidate (Low Priority)
   */
  readonly priorityMultiplier?: number;

  /**
   * Explanatory text for the priority assignment (e.g., 'CROSS_OWNER: usr_A != usr_B')
   */
  readonly ownershipRelationship?: string;

  /**
   * Authorization Pairing Intent (Phase 12.10)
   */
  readonly authorizationIntent?: string;
}

export interface ReplayCandidateInventory {
  /**
   * Flat array of synthesized candidates, sorted alphabetically by candidateId.
   */
  readonly candidates: ReplayCandidate[];

  /**
   * Grouped index for fast lookup by targeted authorization vector.
   */
  readonly candidatesByVector: Record<AuthorizationVector, ReplayCandidate[]>;

  /**
   * Grouped index for fast lookup by logical surface context.
   */
  readonly candidatesBySurface: Record<string, ReplayCandidate[]>;
}
