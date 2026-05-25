import { SemanticIdentityManager } from './semantic-identity';

export interface GraphNode {
  id: string; // Semantic ID
  type: 'USER' | 'ROLE' | 'ROUTE' | 'OBJECT';
  confidence: number;
  lastSeenEpoch: number;
  isProtected: boolean;
  metadata: Record<string, any>;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  relation: string; // e.g., 'OWNS', 'CAN_READ', 'CREATED_BY'
  confidence: number;
}

/**
 * Directed property graph capturing investigation state.
 * Scoped 1:1 to an InvestigationWorkspace. Disposable.
 */
export class KnowledgeGraph {
  public readonly workspaceId: string;
  public nodes: Map<string, GraphNode> = new Map();
  public edges: GraphEdge[] = [];
  
  public readonly identityManager: SemanticIdentityManager;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
    this.identityManager = new SemanticIdentityManager(workspaceId);
  }

  public addNode(node: Omit<GraphNode, 'id'>, rawId: string, roleContext: string): string {
    const semanticId = this.identityManager.generateIdentity(node.type, rawId, roleContext);
    
    if (this.nodes.has(semanticId)) {
      const existing = this.nodes.get(semanticId)!;
      existing.lastSeenEpoch = node.lastSeenEpoch;
      existing.confidence = Math.max(existing.confidence, node.confidence);
      return semanticId;
    }

    this.nodes.set(semanticId, { ...node, id: semanticId });
    return semanticId;
  }

  public addEdge(sourceId: string, targetId: string, relation: string, confidence: number = 1.0) {
    const exists = this.edges.find(e => e.sourceId === sourceId && e.targetId === targetId && e.relation === relation);
    if (!exists) {
      this.edges.push({ sourceId, targetId, relation, confidence });
    }
  }

  public getNodesByType(type: string): GraphNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }
}
