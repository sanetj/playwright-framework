import { BundleInventory, InvestigationBundle } from './investigation-bundle';
import { InvestigationAssemblyInventory, InvestigationAssembly } from './investigation-assembly';
import { ReplayCandidateInventory, ReplayCandidate } from './replay-candidate';
import { ReplayExecutionPlan, ReplayExecutionPlanInventory } from './replay-execution-plan';
import { CanonicalHttpExchange } from '../../runtime/evidence/canonical-http-evidence';

export class ReplayPlanCompiler {
  /**
   * Statelessly compiles a BundleInventory into a stable, deterministic,
   * and frozen ReplayExecutionPlanInventory.
   */
  public compilePlans(
    bundleInventory: BundleInventory,
    assemblyInventory: InvestigationAssemblyInventory,
    candidateInventory: ReplayCandidateInventory,
    exchanges: CanonicalHttpExchange[]
  ): ReplayExecutionPlanInventory {
    const plans: ReplayExecutionPlan[] = [];

    // Index assemblies by ID for fast lookup
    const assembliesById = new Map<string, InvestigationAssembly>();
    for (const asm of assemblyInventory.assemblies) {
      assembliesById.set(asm.assemblyId, asm);
    }

    // Index candidates by ID for fast lookup
    const candidatesById = new Map<string, ReplayCandidate>();
    for (const cand of candidateInventory.candidates) {
      candidatesById.set(cand.candidateId, cand);
    }

    // Index exchanges by raw exchange ID
    const exchangesById = new Map<string, CanonicalHttpExchange>();
    for (const ex of exchanges) {
      exchangesById.set(ex.exchangeId.id, ex);
    }

    for (const bundle of bundleInventory.bundles) {
      // 1. Resolve Investigation Assembly
      const assembly = assembliesById.get(bundle.assemblyId);
      if (!assembly) {
        throw new Error(`MISSING_ASSEMBLY: Bundle ${bundle.bundleId} refers to missing assembly ${bundle.assemblyId}.`);
      }

      // 2. Invariant Check: Reject if baselineExchangeId is missing
      if (!assembly.baselineExchangeId) {
        throw new Error(`MISSING_BASELINE_EXCHANGE: Bundle ${bundle.bundleId} assembly ${assembly.assemblyId} is missing baselineExchangeId.`);
      }

      // 3. Invariant Check: Reject if Replay Candidate (template) is missing
      const candidate = candidatesById.get(assembly.replayCandidateId);
      if (!candidate) {
        throw new Error(`MISSING_REPLAY_TEMPLATE: Bundle ${bundle.bundleId} assembly ${assembly.assemblyId} refers to missing replay candidate ${assembly.replayCandidateId}.`);
      }

      // 4. Resolve baseline CanonicalHttpExchange
      const exchange = exchangesById.get(assembly.baselineExchangeId);
      if (!exchange) {
        throw new Error(`MISSING_EXCHANGE_DATA: Bundle ${bundle.bundleId} assembly ${assembly.assemblyId} baselineExchangeId ${assembly.baselineExchangeId} is missing from exchanges payload.`);
      }

      // 5. Invariant Check: Enforce Safe Methods Only (GET, HEAD)
      const method = candidate.httpMethod.toUpperCase();
      if (method !== 'GET' && method !== 'HEAD') {
        throw new Error(`UNSUPPORTED_METHOD: HTTP method ${method} is not supported in Phase 11.1 (Safe read-only methods only).`);
      }

      // 6. Substitute path parameters to produce concretePath
      let concretePath = candidate.resourceFamily;
      const paramRegex = /:([a-zA-Z0-9_]+)/g;
      const matches = candidate.resourceFamily.match(paramRegex);
      if (matches) {
        if (matches.length > 1 && assembly.targetResourceId.includes(':')) {
          const parts = assembly.targetResourceId.split(':');
          let partIndex = 0;
          concretePath = candidate.resourceFamily.replace(paramRegex, () => {
            const replacement = parts[partIndex] || '';
            partIndex++;
            return replacement;
          });
        } else {
          concretePath = candidate.resourceFamily.replace(paramRegex, assembly.targetResourceId);
        }
      }

      // 7. Clean baseline headers (remove Authorization and Cookie case-insensitively)
      const cleanHeaders = (exchange.request.headers || [])
        .filter(h => {
          const nameLower = h.name.toLowerCase();
          return nameLower !== 'authorization' && nameLower !== 'cookie';
        })
        .map(h => ({ name: h.name, value: h.value }));

      // 8. Assemble ReplayExecutionPlan
      const planId = `plan_${bundle.bundleId}`;
      const requestTemplate = {
        method: method as 'GET' | 'HEAD',
        pathTemplate: candidate.resourceFamily,
        concretePath,
        headers: Object.freeze(cleanHeaders),
        bodyStr: exchange.request.bodyStr
      };

      const mutationStrategy = {
        subjectAuthContext: assembly.subjectId,
        ownerResourceContext: {
          ownerId: assembly.ownerId,
          targetResourceId: assembly.targetResourceId
        }
      };

      plans.push(Object.freeze({
        planId,
        bundleId: bundle.bundleId,
        assemblyId: assembly.assemblyId,
        baselineExchangeId: assembly.baselineExchangeId,
        subjectAuthContext: assembly.subjectId,
        ownerResourceContext: Object.freeze(mutationStrategy.ownerResourceContext),
        allowedMethod: method as 'GET' | 'HEAD',
        targetResourceFamily: bundle.targetResourceFamily,
        targetResourceId: assembly.targetResourceId,
        replayCandidateId: assembly.replayCandidateId,
        requestTemplate: Object.freeze(requestTemplate)
      }));
    }

    // 9. Deterministic Sort alphabetically by planId
    plans.sort((a, b) => a.planId.localeCompare(b.planId));

    return Object.freeze({
      plans: Object.freeze(plans)
    });
  }
}
