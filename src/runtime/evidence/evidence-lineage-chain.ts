import { RuntimeExchangeId } from './runtime-exchange-id';

export interface EvidenceLineageChain {
    findingId: string;
    replayId: string;
    sourceExchangeIds: RuntimeExchangeId[];
    mutationIds: string[];
    sessionLineage: string[];
    roleLineage: string[];
    proofArtifacts: string[];
}
