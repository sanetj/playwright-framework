import { ActionGraph, GraphNode } from '../graph/action-graph';
import { RoleDifferentialResult } from './role-differential';

export interface DifferentialComparisonResult {
  baseRoleId: string;
  comparisonRoleId: string;
  
  // APIs reachable by comparisonRole but NOT by baseRole
  // If baseRole is 'User' and comparison is 'Admin', these are Admin-only APIs.
  // If baseRole is 'Admin' and comparison is 'User', these are Privilege Escalation candidates.
  exclusiveToComparison: GraphNode[];
  exclusiveToBase: GraphNode[];
  
  // APIs reachable by both
  sharedReachability: GraphNode[];
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

    // Find nodes in base
    for (const [id, node] of baseNodes) {
      if (compNodes.has(id)) {
        sharedReachability.push(node);
      } else {
        exclusiveToBase.push(node);
      }
    }

    // Find nodes exclusively in comparison
    for (const [id, node] of compNodes) {
      if (!baseNodes.has(id)) {
        exclusiveToComparison.push(node);
      }
    }

    return {
      baseRoleId,
      comparisonRoleId,
      exclusiveToBase,
      exclusiveToComparison,
      sharedReachability
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
