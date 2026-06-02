import { FindingCandidateInventory } from './finding-candidate';
import { InvestigationAssemblyInventory, InvestigationAssembly } from './investigation-assembly';
import { ReplayCandidateInventory, ReplayCandidate } from './replay-candidate';
import { FindingNarrative, FindingNarrativeInventory, NarrativeFragment } from './finding-narrative';
import { AuthorizationVector } from './authorization-vector';

export class NarrativeBuilder {
  /**
   * Statelessly constructs FindingNarrativeInventory from finding candidates,
   * assemblies, and replay candidates.
   */
  public buildNarratives(
    candidateInventory: FindingCandidateInventory,
    assemblyInventory: InvestigationAssemblyInventory,
    replayCandidateInventory: ReplayCandidateInventory
  ): FindingNarrativeInventory {
    const narratives: FindingNarrative[] = [];

    // Create fast lookup map for assemblies
    const assembliesById = new Map<string, InvestigationAssembly>();
    for (const asm of assemblyInventory.assemblies) {
      assembliesById.set(asm.assemblyId, asm);
    }

    // Create fast lookup map for replay candidates
    const replayCandidatesById = new Map<string, ReplayCandidate>();
    for (const rc of replayCandidateInventory.candidates) {
      replayCandidatesById.set(rc.candidateId, rc);
    }

    for (const fc of candidateInventory.candidates) {
      // Resolve primary assembly reference
      const primaryAsmId = fc.assemblyIds[0];
      if (!primaryAsmId) {
        continue;
      }

      const assembly = assembliesById.get(primaryAsmId);
      if (!assembly) {
        continue;
      }

      // Resolve HTTP Method cleanly from ReplayCandidate object
      const rc = replayCandidatesById.get(assembly.replayCandidateId);
      const httpMethod = rc ? rc.httpMethod : 'UNKNOWN';

      const narrativeId = `nar_${fc.candidateId}`;

      // Assemble core structured logical facts
      const facts = {
        subjectId: assembly.subjectId,
        ownerId: assembly.ownerId,
        httpMethod
      };

      // Assemble machine-readable fragments
      const fragments: NarrativeFragment[] = [
        {
          key: 'ATTEMPTED_ACTION',
          value: httpMethod,
          description: 'The HTTP request method executed during the candidate validation.'
        },
        {
          key: 'OWNER_IDENTITY',
          value: assembly.ownerId,
          description: 'The identity profile ID of the legitimate resource owner.'
        },
        {
          key: 'SUBJECT_IDENTITY',
          value: assembly.subjectId,
          description: 'The identity profile ID of the attacking subject actor.'
        }
      ];

      // Sort fragments alphabetically by key to guarantee determinism
      fragments.sort((a, b) => a.key.localeCompare(b.key));

      narratives.push(Object.freeze({
        narrativeId,
        candidateId: fc.candidateId,
        assemblyId: assembly.assemblyId,
        vector: fc.vector,
        targetResourceFamily: fc.targetResourceFamily,
        authorizationSurface: fc.authorizationSurface,
        facts: Object.freeze(facts),
        fragments: Object.freeze(fragments)
      }));
    }

    // Sort narratives alphabetically by narrativeId
    narratives.sort((a, b) => a.narrativeId.localeCompare(b.narrativeId));

    // Group by vector index
    const narrativesByVector: Record<AuthorizationVector, FindingNarrative[]> = {
      IDOR: [],
      BAC: [],
      TENANT_ISOLATION: []
    };

    for (const nar of narratives) {
      narrativesByVector[nar.vector].push(nar);
    }

    // Freeze secondary index lists
    for (const vec of Object.keys(narrativesByVector) as AuthorizationVector[]) {
      Object.freeze(narrativesByVector[vec]);
    }

    return Object.freeze({
      narratives: Object.freeze(narratives),
      narrativesByVector: Object.freeze(narrativesByVector)
    });
  }
}
