import { DifferentialComparisonResult } from '../differentials/concrete-differential-engine';
import { CanonicalHttpExchange } from '../../runtime/evidence/canonical-http-evidence';
import { LineageExtractionResult } from '../../runtime/instrumentation/entity-lineage-extractor';
import { BountyRoiScorer } from '../../runtime/differential/bounty-roi-score';
import { FindingPriorityRanker, FindingPriorityLevel } from '../../runtime/differential/finding-priority';
import { ExportProfileManager, ExportProfileMode } from '../../runtime/artifacts/export-profile';
import { BundleRedactor } from '../../runtime/artifacts/bundle-redaction';
import { ExploitProof } from '../../runtime/evidence/exploit-proof-capture';
import { OwnershipLink } from '../ontology/entity-lineage';

export interface ContradictionEvidenceMapping {
  findingType: string;
  endpoint: string;
  method: string;
  url: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  evidenceExchangeIds: string[];
  lineageRefs: string[];
}

export interface SharedEvidenceSegment {
  segmentId: string;
  evidenceExchangeIds: string[];
  lineageRefs: string[];
}

export interface CompressedContradictionSummary {
  sharedEvidencePool: SharedEvidenceSegment[];
  normalizedContradictions: {
    findingType: string;
    endpoint: string;
    method: string;
    url: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    sharedEvidenceRefId: string;
  }[];
}

export interface GroupedContradictionSummary {
  totalContradictions: number;
  byType: Record<string, string[]>;
  contradictions: ContradictionEvidenceMapping[];
  compressedSummary?: CompressedContradictionSummary;
}

export interface InvestigationBundle {
  targetDomain: string;
  generatedAt: string;
  exportMode: string;
  differentialAnalysis: {
    baseRole: string;
    comparisonRole: string;
    findings: {
      type: 'IDOR_CANDIDATE' | 'PRIVILEGE_ESCALATION_CANDIDATE' | 'TENANT_ESCAPE_CANDIDATE' | 'STATUS_CONTRADICTION';
      targetEndpoint: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      priority: FindingPriorityLevel;
      roiScore: number;
      description: string;
      
      // Exploit Validation Properties
      isValidated?: boolean;
      validationConfidence?: string;

      proofs?: ExploitProof[];
      proofNarrative?: string;
    }[];
    sharedReachability?: string[];
  };
  evidenceExchanges: any[];
  lineage: LineageExtractionResult[];
  groupedContradictionSummary?: GroupedContradictionSummary;
  ownershipLinks?: OwnershipLink[];
}

export class AiBundleCompressor {
  /**
   * Compresses the raw evidence, differential results, and lineage into a minimal,
   * high-signal JSON structure designed specifically to fit into LLM context windows.
   */
  public compress(
    domain: string,
    diffResult: DifferentialComparisonResult, 
    exchanges: CanonicalHttpExchange[], 
    lineageData: LineageExtractionResult[],
    exportMode: ExportProfileMode = ExportProfileMode.CONCISE_AI,
    ownershipLinks: OwnershipLink[] = []
  ): InvestigationBundle {
    
    const roiScorer = new BountyRoiScorer();
    const priorityRanker = new FindingPriorityRanker();

    // 1. Summarize Findings
    const findings: InvestigationBundle['differentialAnalysis']['findings'] = [];
    
    for (const finding of diffResult.findings) {
      const parts = (finding.targetEntityId || '').split(':');
      const method = parts.length > 1 ? parts[1] : 'GET';
      const url = parts.length > 2 ? parts.slice(2).join(':') : (finding.targetEntityId || '');
      
      const isSensitive = roiScorer.isSensitive(url);
      const isPrivEsc = finding.type === 'PRIVILEGE_ESCALATION_CANDIDATE';
      const roi = roiScorer.calculateRoiScore(method, url, isPrivEsc, method === 'DELETE', isSensitive);
      const priority = priorityRanker.rankFinding(roi, 0.8, 1.0); // Assume high reproducibility for E2E dummy
      
      findings.push({
        type: finding.type as any,
        targetEndpoint: finding.targetEntityId || 'unknown',
        severity: 'HIGH',
        priority,
        roiScore: roi,
        description: finding.description,
        isValidated: (finding as any).isValidated,
        validationConfidence: (finding as any).validationConfidence,
        proofs: (finding as any).proofs,
        proofNarrative: (finding as any).isValidated ? `Successfully validated ${finding.type} via deterministic replay mutation.` : undefined
      });
    }

    // 3. Build Grouped Contradiction Summary deterministically
    const contradictionList: ContradictionEvidenceMapping[] = [];
    const byType: Record<string, string[]> = {};
    const requiredExchangeIds = new Set<string>();

    for (const finding of findings) {
      const parts = finding.targetEndpoint.split(':');
      const method = parts.length > 1 ? parts[1] : 'GET';
      const url = parts.length > 2 ? parts.slice(2).join(':') : finding.targetEndpoint;

      const getPathOnly = (u: string): string => {
        const match = u.match(/https?:\/\/[^\/]+(\/.*)/);
        if (match && match[1]) {
          return match[1].split('?')[0];
        }
        const idx = u.indexOf('/');
        if (idx !== -1 && !u.startsWith('http')) {
          return u.substring(idx).split('?')[0];
        }
        return u.split('?')[0];
      };

      const maskIds = (u: string): string => {
        const idMaskRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b[0-9a-f]{24}\b|\b[a-zA-Z]+_[a-zA-Z0-9]+\b|\b\d+\b/gi;
        return u.replace(idMaskRegex, '{ID}');
      };

      const findingPath = getPathOnly(url);

      const matchingExchanges = exchanges.filter(ex => {
        if (ex.request.method.toUpperCase() !== method.toUpperCase()) return false;
        const rawExPath = getPathOnly(ex.request.url);
        const exPath = maskIds(rawExPath);
        return exPath === findingPath || exPath.includes(findingPath) || findingPath.includes(exPath);
      });

      const evidenceExchangeIds = matchingExchanges.map(ex => ex.exchangeId.id).sort();
      for (const id of evidenceExchangeIds) {
        requiredExchangeIds.add(id);
      }

      const lineageRefs: string[] = [];
      for (const ex of matchingExchanges) {
        const matchingLineage = lineageData.find(l => l.exchangeId === ex.exchangeId.id);
        if (matchingLineage) {
          for (const ent of matchingLineage.entities) {
            const refStr = `${ent.entityType}:${ent.value}`;
            if (!lineageRefs.includes(refStr)) {
              lineageRefs.push(refStr);
            }
          }
        }
      }
      lineageRefs.sort();

      const contradiction: ContradictionEvidenceMapping = {
        findingType: finding.type,
        endpoint: finding.targetEndpoint,
        method,
        url,
        severity: finding.severity,
        description: finding.description,
        evidenceExchangeIds,
        lineageRefs
      };

      contradictionList.push(contradiction);

      if (!byType[finding.type]) {
        byType[finding.type] = [];
      }
      if (!byType[finding.type].includes(finding.targetEndpoint)) {
        byType[finding.type].push(finding.targetEndpoint);
      }
    }

    for (const key of Object.keys(byType)) {
      byType[key].sort();
    }

    // 2. Compress Exchanges Using Export Profiles
    const profileManager = new ExportProfileManager();
    const config = profileManager.getConfig(exportMode);
    const redactor = new BundleRedactor();

    const compressedExchanges = exchanges
      .filter(ex => requiredExchangeIds.has(ex.exchangeId.id))
      .map(ex => redactor.redactExchange(ex, config));

    // Deterministically compress structurally repeated E2E lineage/evidence
    const uniqueEvidenceMapStrings: string[] = [];
    for (const contra of contradictionList) {
      const keyStr = `ex:${[...contra.evidenceExchangeIds].sort().join(',')}|lin:${[...contra.lineageRefs].sort().join(',')}`;
      if (!uniqueEvidenceMapStrings.includes(keyStr)) {
        uniqueEvidenceMapStrings.push(keyStr);
      }
    }

    uniqueEvidenceMapStrings.sort();

    const sharedEvidencePool: SharedEvidenceSegment[] = uniqueEvidenceMapStrings.map((keyStr, index) => {
      const parts = keyStr.split('|');
      const exPart = parts[0].substring(3);
      const linPart = parts[1].substring(4);
      return {
        segmentId: `evseg_${index}`,
        evidenceExchangeIds: exPart ? exPart.split(',') : [],
        lineageRefs: linPart ? linPart.split(',') : []
      };
    });

    const normalizedContradictions = contradictionList.map(contra => {
      const keyStr = `ex:${[...contra.evidenceExchangeIds].sort().join(',')}|lin:${[...contra.lineageRefs].sort().join(',')}`;
      const poolIndex = uniqueEvidenceMapStrings.indexOf(keyStr);
      return {
        findingType: contra.findingType,
        endpoint: contra.endpoint,
        method: contra.method,
        url: contra.url,
        severity: contra.severity,
        description: contra.description,
        sharedEvidenceRefId: `evseg_${poolIndex}`
      };
    });

    normalizedContradictions.sort((a, b) => {
      const entComp = a.endpoint.localeCompare(b.endpoint);
      if (entComp !== 0) return entComp;
      return a.findingType.localeCompare(b.findingType);
    });

    const compressedSummary: CompressedContradictionSummary = {
      sharedEvidencePool,
      normalizedContradictions
    };

    const groupedContradictionSummary: GroupedContradictionSummary = {
      totalContradictions: contradictionList.length,
      byType,
      contradictions: contradictionList,
      compressedSummary
    };

    return {
      targetDomain: domain,
      generatedAt: new Date().toISOString(),
      exportMode,
      differentialAnalysis: {
        baseRole: diffResult.baseRoleId,
        comparisonRole: diffResult.comparisonRoleId,
        findings,
        sharedReachability: diffResult.sharedReachability.map(node => node.id)
      },
      evidenceExchanges: compressedExchanges,
      lineage: lineageData,
      groupedContradictionSummary,
      ownershipLinks
    };
  }

}

