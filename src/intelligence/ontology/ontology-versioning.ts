/**
 * @canonical
 * Ontology Versioning Hooks
 * Allows deterministic replay traces to outlive ontology evolution.
 */

export interface OntologyVersion {
  versionString: string;
  astHash: string;
  releasedAtTs: number;
}

export interface SemanticDeprecationRule {
  deprecatedPrimitiveId: string;
  replacedByPrimitiveId?: string;
  deprecationVersionStr: string;
  sunsetVersionStr: string;
}

export interface OntologyMigrationHint {
  targetVersionHash: string;
  migrationFunctionPath?: string;
}

export interface SemanticCompatibility {
  isCompatible: boolean;
  requiredMigrations: OntologyMigrationHint[];
}

export interface ReplayCompatibilityContract {
  traceOntologyVersion: OntologyVersion;
  currentOntologyVersion: OntologyVersion;
  checkCompatibility(): SemanticCompatibility;
}
