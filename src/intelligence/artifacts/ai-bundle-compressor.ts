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
      type: 'IDOR_CANDIDATE' | 'PRIVILEGE_ESCALATION_CANDIDATE' | 'TENANT_ESCAPE_CANDIDATE';
      endpoint: string;
      evidenceDescription: string;
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
        endpoint: node.label,
        evidenceDescription: `Endpoint reachable by ${diffResult.comparisonRoleId} but not by ${diffResult.baseRoleId}.`
      });
    }

    // (In reality, we would do more complex logic here for IDORs based on shared reachability + entity lineage overlaps)

    // 2. Compress Exchanges
    // We do NOT want to send massive 2MB JSON bodies to an LLM if they aren't relevant.
    // We strip out massive headers, reduce bodies to snippets or keys.
    const relevantExchangeIds = new Set<string>();
    // Assume we filter to only exchanges related to the findings for compression
    // For this implementation, we take a slice of the most important ones.
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
    // Keep method, url, status.
    // Strip headers down to just the critical ones (Auth, Cookie, Content-Type)
    const keepHeaders = ['authorization', 'cookie', 'content-type'];
    const compressedReqHeaders = ex.request.headers.filter(h => keepHeaders.includes(h.name.toLowerCase()));
    
    // Truncate bodies
    const maxBodyLen = 500;
    const reqBody = ex.request.bodyStr ? ex.request.bodyStr.slice(0, maxBodyLen) + (ex.request.bodyStr.length > maxBodyLen ? '...[TRUNCATED]' : '') : undefined;
    const resBody = ex.response?.bodyStr ? ex.response.bodyStr.slice(0, maxBodyLen) + (ex.response.bodyStr.length > maxBodyLen ? '...[TRUNCATED]' : '') : undefined;

    return {
      exchangeId: ex.exchangeId,
      timestamp: ex.timestamp,
      request: {
        method: ex.request.method,
        url: ex.request.url,
        headers: compressedReqHeaders,
        bodyStr: reqBody
      },
      response: ex.response ? {
        status: ex.response.status,
        headers: ex.response.headers.filter(h => keepHeaders.includes(h.name.toLowerCase())),
        bodyStr: resBody
      } : undefined
    };
  }
}
