import { FindingNarrativeInventory } from './finding-narrative';
import { InvestigationAssemblyInventory, InvestigationAssembly } from './investigation-assembly';
import { FindingEvidenceMap, EvidenceMapInventory } from './finding-evidence-map';
import { AuthorizationVector } from './authorization-vector';

export class EvidenceMapper {
  /**
   * Statelessly constructs EvidenceMapInventory by mapping FindingNarrativeInventory
   * back to the raw telemetry identifiers in the InvestigationAssemblyInventory.
   */
  public mapEvidence(
    narrativeInventory: FindingNarrativeInventory,
    assemblyInventory: InvestigationAssemblyInventory
  ): EvidenceMapInventory {
    const maps: FindingEvidenceMap[] = [];

    // Create fast lookup map for assemblies
    const assembliesById = new Map<string, InvestigationAssembly>();
    for (const asm of assemblyInventory.assemblies) {
      assembliesById.set(asm.assemblyId, asm);
    }

    const processedNarratives = new Set<string>();

    for (const nar of narrativeInventory.narratives) {
      if (processedNarratives.has(nar.narrativeId)) {
        continue;
      }
      processedNarratives.add(nar.narrativeId);

      const assembly = assembliesById.get(nar.assemblyId);
      if (!assembly) {
        continue;
      }

      const evidenceMapId = `evmap_${nar.narrativeId}`;

      maps.push(Object.freeze({
        evidenceMapId,
        narrativeId: nar.narrativeId,
        candidateId: nar.candidateId,
        vector: nar.vector,
        targetResourceFamily: nar.targetResourceFamily,
        authorizationSurface: nar.authorizationSurface,
        evidence: Object.freeze({
          assemblyId: assembly.assemblyId
        })
      }));
    }

    // Sort evidence maps alphabetically by evidenceMapId to guarantee determinism
    maps.sort((a, b) => a.evidenceMapId.localeCompare(b.evidenceMapId));

    // Group by vector index
    const mapsByVector: Record<AuthorizationVector, FindingEvidenceMap[]> = {
      IDOR: [],
      BAC: [],
      TENANT_ISOLATION: []
    };

    for (const map of maps) {
      mapsByVector[map.vector].push(map);
    }

    // Freeze secondary index lists
    for (const vec of Object.keys(mapsByVector) as AuthorizationVector[]) {
      Object.freeze(mapsByVector[vec]);
    }

    return Object.freeze({
      maps: Object.freeze(maps),
      mapsByVector: Object.freeze(mapsByVector)
    });
  }
}
