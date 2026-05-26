import { ActionGraph, GraphNode } from '../../graph/action-graph';
import { RoleDifferentialResult } from './role-differential';

export interface DifferentialFinding {
  findingId?: string;
  type: 'IDOR_CANDIDATE' | 'PRIVILEGE_ESCALATION_CANDIDATE' | 'STATUS_CONTRADICTION' | 'TENANT_ESCAPE_CANDIDATE';
  targetEntityId?: string;
  targetRole: string;
  baseStatus?: number;
  comparisonStatus?: number;
  description: string;
}

export interface DifferentialComparisonResult {
  baseRoleId: string;
  comparisonRoleId: string;
  
  // APIs reachable by comparisonRole but NOT by baseRole
  // If baseRole is 'User' and comparison is 'Admin', these are Admin-only APIs.
  // If baseRole is 'Admin' and comparison is 'User', these are Privilege Escalation candidates.
  exclusiveToComparison: GraphNode[];
  exclusiveToBase: GraphNode[];
  
  // APIs reachable by both with similar response codes
  sharedReachability: GraphNode[];

  // APIs reachable by both but with different status codes (e.g., 200 vs 403)
  statusContradictions: Array<{
    nodeId: string;
    baseStatus: number;
    comparisonStatus: number;
    baseNode: GraphNode;
    comparisonNode: GraphNode;
  }>;
  
  findings: DifferentialFinding[];
}

export class ConcreteDifferentialEngine {
  /**
   * Computes the set difference between two canonicalized ActionGraphs.
   * Assumes both graphs have already passed through WorkflowCanonicalizer.
   */
  public compare(baseGraph: ActionGraph, comparisonGraph: ActionGraph, baseRoleId: string, comparisonRoleId: string): DifferentialComparisonResult {
    const baseNodes = new Map(baseGraph.toJSON().nodes.filter(n => n.kind === 'api').map(n => [n.id, n]));
    const compNodes = new Map(comparisonGraph.toJSON().nodes.filter(n => n.kind === 'api').map(n => [n.id, n]));

    const exclusiveToBase: GraphNode[] = [];
    const exclusiveToComparison: GraphNode[] = [];
    const sharedReachability: GraphNode[] = [];
    const statusContradictions = [];

    // Find nodes in base
    for (const [id, baseNode] of Array.from(baseNodes.entries())) {
      if (compNodes.has(id)) {
        const compNode = compNodes.get(id)!;
        const baseStatus = (baseNode.attrs.status as number) || 0;
        const compStatus = (compNode.attrs.status as number) || 0;

        if (baseStatus !== compStatus && baseStatus !== 0 && compStatus !== 0) {
          statusContradictions.push({
            nodeId: id,
            baseStatus,
            comparisonStatus: compStatus,
            baseNode,
            comparisonNode: compNode
          });
        } else {
          sharedReachability.push(baseNode);
        }
      } else {
        exclusiveToBase.push(baseNode);
      }
    }

    // Find nodes exclusively in comparison
    for (const [id, node] of Array.from(compNodes.entries())) {
      if (!baseNodes.has(id)) {
        exclusiveToComparison.push(node);
      }
    }

    // Build generic findings array to satisfy newer pipeline requirements
    const findings: DifferentialFinding[] = [];
    
    for (const node of exclusiveToComparison) {
       findings.push({
          findingId: `finding_${Date.now()}_${Math.random()}`,
          type: 'PRIVILEGE_ESCALATION_CANDIDATE',
          targetEntityId: node.id,
          targetRole: comparisonRoleId,
          description: `Endpoint reachable by ${comparisonRoleId} but not by ${baseRoleId}`
       });
    }
    
    for (const contra of statusContradictions) {
       let type: 'STATUS_CONTRADICTION' | 'PRIVILEGE_ESCALATION_CANDIDATE' = 'STATUS_CONTRADICTION';
       if (contra.baseStatus === 403 && contra.comparisonStatus === 200) {
          type = 'PRIVILEGE_ESCALATION_CANDIDATE';
       }
       findings.push({
          findingId: `finding_${Date.now()}_${Math.random()}`,
          type,
          targetEntityId: contra.nodeId,
          targetRole: comparisonRoleId,
          baseStatus: contra.baseStatus,
          comparisonStatus: contra.comparisonStatus,
          description: `Base role got status ${contra.baseStatus}, but comparison role got ${contra.comparisonStatus}`
       });
    }

    return {
      baseRoleId,
      comparisonRoleId,
      exclusiveToBase,
      exclusiveToComparison,
      sharedReachability,
      statusContradictions,
      findings
    };
  }

  /**
   * Identifies Privilege Escalation candidates.
   * A PrivEsc candidate is an API that is marked as requiring High Privilege,
   * but is found in the 'sharedReachability' when comparing a Low Privilege role to a High Privilege role.
   * Or, if we establish the High Privilege graph first, and then find those nodes in the Low Privilege graph.
   */
  public extractPrivilegeEscalationCandidates(result: DifferentialComparisonResult, knownHighPrivilegeApis: Set<string>): GraphNode[] {
    // Assuming base is LowPriv, comparison is HighPriv
    // If a known high priv API is in the shared list, the low priv user reached it!
    return result.sharedReachability.filter(node => knownHighPrivilegeApis.has(node.id));
  }
}

