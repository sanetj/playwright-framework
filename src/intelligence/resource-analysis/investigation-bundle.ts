import { AuthorizationVector } from './authorization-vector';

export interface InvestigationBundle {
  readonly bundleId: string;

  readonly candidateId: string;
  readonly narrativeId: string;
  readonly evidenceMapId: string;
  readonly assemblyId: string;

  readonly vector: AuthorizationVector;
  readonly targetResourceFamily: string;
  readonly authorizationSurface: string;
}

export interface BundleInventory {
  readonly bundles: readonly InvestigationBundle[];

  readonly bundlesByVector:
    Readonly<Record<AuthorizationVector, readonly InvestigationBundle[]>>;
}
