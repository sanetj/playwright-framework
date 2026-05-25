import { DifferentialComparisonResult } from '../differentials/concrete-differential-engine';
import { CanonicalHttpExchange } from '../../runtime/evidence/canonical-http-evidence';
import { LineageExtractionResult } from '../../runtime/instrumentation/entity-lineage-extractor';
import { BountyRoiScorer } from '../../runtime/differential/bounty-roi-score';
import { FindingPriorityRanker, FindingPriorityLevel } from '../../runtime/differential/finding-priority';
import { ExportProfileManager, ExportProfileMode } from '../../runtime/artifacts/export-profile';
import { BundleRedactor } from '../../runtime/artifacts/bundle-redaction';

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
      proofs?: any[];
      proofNarrative?: string;
    }[];
  };
  evidenceExchanges: any[];
  lineage: LineageExtractionResult[];
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
    exportMode: ExportProfileMode = ExportProfileMode.CONCISE_AI
  ): InvestigationBundle {
    
    const roiScorer = new BountyRoiScorer();
    const priorityRanker = new FindingPriorityRanker();

    // 1. Summarize Findings
    const findings: InvestigationBundle['differentialAnalysis']['findings'] = [];
    
    for (const node of diffResult.exclusiveToComparison) {
      // Very naive scoring for missing components, full implementation in pipeline
      const roi = roiScorer.calculateRoiScore('GET', node.label, true, false, false);
      const priority = priorityRanker.rankFinding(roi, 0.5, 0.8); // Placeholder scores
      
      findings.push({
        type: 'PRIVILEGE_ESCALATION_CANDIDATE',
        targetEndpoint: node.label,
        severity: 'HIGH',
        priority,
        roiScore: roi,
        description: `Endpoint reachable by ${diffResult.comparisonRoleId} but not by ${diffResult.baseRoleId}.`,
        isValidated: (node as any).isValidated,
        validationConfidence: (node as any).validationConfidence,
        proofs: (node as any).proofs
      });
    }

    if (diffResult.statusContradictions) {
      for (const contra of diffResult.statusContradictions) {
        let type: 'STATUS_CONTRADICTION' | 'PRIVILEGE_ESCALATION_CANDIDATE' | 'IDOR_CANDIDATE' = 'STATUS_CONTRADICTION';
        if (contra.baseStatus === 403 && contra.comparisonStatus === 200) {
           type = 'PRIVILEGE_ESCALATION_CANDIDATE';
        }
        
        // Extract method and url from nodeId (e.g. api:GET:http://...)
        const parts = contra.nodeId.split(':');
        const method = parts.length > 1 ? parts[1] : 'GET';
        const url = parts.length > 2 ? parts.slice(2).join(':') : contra.nodeId;
        
        const isSensitive = roiScorer.isSensitive(url);
        const roi = roiScorer.calculateRoiScore(method, url, type === 'PRIVILEGE_ESCALATION_CANDIDATE', method === 'DELETE', isSensitive);
        const priority = priorityRanker.rankFinding(roi, 0.8, 1.0); // Assume high reproducibility for E2E dummy

        findings.push({
          type,
          targetEndpoint: contra.nodeId,
          severity: 'HIGH',
          priority,
          roiScore: roi,
          description: `Base role got status ${contra.baseStatus}, but comparison role got ${contra.comparisonStatus}.`,
          isValidated: (contra as any).isValidated,
          validationConfidence: (contra as any).validationConfidence,
          proofs: (contra as any).proofs,
          proofNarrative: (contra as any).isValidated ? `Successfully validated ${type} via deterministic replay mutation.` : undefined
        });
      }
    }

    // 2. Compress Exchanges Using Export Profiles
    const profileManager = new ExportProfileManager();
    const config = profileManager.getConfig(exportMode);
    const redactor = new BundleRedactor();

    const compressedExchanges = exchanges.slice(0, 10).map(ex => redactor.redactExchange(ex, config));

    return {
      targetDomain: domain,
      generatedAt: new Date().toISOString(),
      exportMode,
      differentialAnalysis: {
        baseRole: diffResult.baseRoleId,
        comparisonRole: diffResult.comparisonRoleId,
        findings
      },
      evidenceExchanges: compressedExchanges,
      lineage: lineageData
    };
  }

}

