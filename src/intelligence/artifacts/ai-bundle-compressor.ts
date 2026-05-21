import { DifferentialComparisonResult } from '../differentials/concrete-differential-engine';
import { CanonicalHttpExchange } from '../../runtime/evidence/canonical-http-evidence';
import { LineageExtractionResult } from '../../runtime/instrumentation/entity-lineage-extractor';

export interface InvestigationBundle {
  targetDomain: string;
  generatedAt: string;
  differentialAnalysis: {
    baseRole: string;
    comparisonRole: string;
    findings: {
      type: 'IDOR_CANDIDATE' | 'PRIVILEGE_ESCALATION_CANDIDATE' | 'TENANT_ESCAPE_CANDIDATE' | 'STATUS_CONTRADICTION';
      targetEndpoint: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      description: string;
    }[];
  };
  evidenceExchanges: Partial<CanonicalHttpExchange>[];
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
    lineageData: LineageExtractionResult[]
  ): InvestigationBundle {
    
    // 1. Summarize Findings
    const findings: InvestigationBundle['differentialAnalysis']['findings'] = [];
    
    for (const node of diffResult.exclusiveToComparison) {
      findings.push({
        type: 'PRIVILEGE_ESCALATION_CANDIDATE',
        targetEndpoint: node.label,
        severity: 'HIGH',
        description: `Endpoint reachable by ${diffResult.comparisonRoleId} but not by ${diffResult.baseRoleId}.`
      });
    }

    if (diffResult.statusContradictions) {
      for (const contra of diffResult.statusContradictions) {
        let type: 'STATUS_CONTRADICTION' | 'PRIVILEGE_ESCALATION_CANDIDATE' | 'IDOR_CANDIDATE' = 'STATUS_CONTRADICTION';
        if (contra.baseStatus === 403 && contra.comparisonStatus === 200) {
           type = 'PRIVILEGE_ESCALATION_CANDIDATE';
        }
        
        findings.push({
          type,
          targetEndpoint: contra.nodeId,
          severity: 'HIGH',
          description: `Base role got status ${contra.baseStatus}, but comparison role got ${contra.comparisonStatus}.`
        });
      }
    }

    // 2. Compress Exchanges
    const relevantExchangeIds = new Set<string>();
    const compressedExchanges = exchanges.slice(0, 10).map(ex => this.compressExchange(ex));

    return {
      targetDomain: domain,
      generatedAt: new Date().toISOString(),
      differentialAnalysis: {
        baseRole: diffResult.baseRoleId,
        comparisonRole: diffResult.comparisonRoleId,
        findings
      },
      evidenceExchanges: compressedExchanges,
      lineage: lineageData
    };
  }

  private compressExchange(ex: CanonicalHttpExchange): Partial<CanonicalHttpExchange> {
    const keepHeaders = ['authorization', 'cookie', 'content-type'];
    const compressedReqHeaders = ex.request.headers.filter(h => keepHeaders.includes(h.name.toLowerCase()));
    
    const maxBodyLen = 500;
    const reqBody = ex.request.bodyStr ? ex.request.bodyStr.slice(0, maxBodyLen) + (ex.request.bodyStr.length > maxBodyLen ? '...[TRUNCATED]' : '') : undefined;
    const resBody = ex.response?.bodyStr ? ex.response.bodyStr.slice(0, maxBodyLen) + (ex.response.bodyStr.length > maxBodyLen ? '...[TRUNCATED]' : '') : undefined;

    return {
      exchangeId: ex.exchangeId,
      sessionId: ex.sessionId,
      timestamp: ex.timestamp,
      request: {
        method: ex.request.method,
        url: ex.request.url,
        headers: compressedReqHeaders,
        bodyStr: reqBody
      } as any,
      response: ex.response ? {
        status: ex.response.status,
        headers: ex.response.headers.filter(h => keepHeaders.includes(h.name.toLowerCase())),
        bodyStr: resBody
      } as any : undefined
    };
  }
}

