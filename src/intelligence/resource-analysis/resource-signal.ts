/**
 * @canonical
 * Phase 10.1A Resource Signal Extraction Contracts
 * Timeless, deterministic types mapping observed resources into investigation signals.
 */

export type ResourceTypeSignal =
  | 'DOCUMENT'
  | 'USER'
  | 'BILLING'
  | 'TENANT'
  | 'WORKSPACE'
  | 'EXPORT'
  | 'REPORT';

export type InvestigationSignalType =
  | 'OBJECT_IDENTIFIER_PRESENT'
  | 'CROSS_ROLE_VISIBLE'
  | 'TENANT_SCOPED'
  | 'USER_SCOPED'
  | 'BOUNDARY_ADJACENT'
  | 'EXPORT_CAPABLE'
  | 'DOWNLOAD_CAPABLE'
  | 'PRIVILEGE_TRANSITION_OBSERVED';

export interface ResourceSignal {
  /**
   * Parameterized route template grouping dynamic paths.
   * e.g., "/rest/basket/:basketId" instead of "/rest/basket/1"
   */
  readonly resourceFamily: string;

  /**
   * Stable, human-readable timeless identifier format: "${httpMethod}::${resourceFamily}"
   * e.g., "GET::/rest/basket/:basketId"
   * @invariant SIGNATURE-STABILITY: Every execution over the same family + method yields identical signatures.
   */
  readonly resourceSignature: string;

  readonly httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  readonly primaryType: ResourceTypeSignal;

  /**
   * Lexicographically sorted collection of investigation flags.
   */
  readonly investigationSignals: InvestigationSignalType[];

  /**
   * Stable logical categorization grouping related resource families.
   * e.g., "Basket Surface" for all basket routes.
   */
  readonly authorizationSurface: string;

  /**
   * Alphabetically sorted query or body parameter keys observed.
   */
  readonly parameterSignature: string[];

  /**
   * IDs of baseline CanonicalHttpExchanges backing this signal.
   */
  readonly evidenceExchangeIds: string[];
}

export interface ResourceSignalInventory {
  readonly exportVersion: string;

  /**
   * Flat array of resource signals, sorted alphabetically by resourceSignature.
   */
  readonly signals: ResourceSignal[];

  /**
   * Grouped lookup index mapping surface names to their member resource signals.
   */
  readonly signalsBySurface: Record<string, ResourceSignal[]>;
}
