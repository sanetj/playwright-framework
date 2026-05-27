import { WorkflowEntity, WorkflowTransition } from '../workflow-models/workflow-entities';

const MAX_WORKFLOW_PATHS = 100;

export interface WorkflowPath {
  id: string;
  entityIds: string[];
}

/**
 * WorkflowPathExtractor
 * Deterministically traces entity transitions to construct sequential workflow paths.
 */
export class WorkflowPathExtractor {
  /**
   * Traces workflow paths from entities and transitions.
   *
   * @param entities Workflow entities (nodes)
   * @param transitions Transitions between entities (directed edges)
   * @returns Deterministically traced and sorted paths
   */
  public extractPaths(
    entities: WorkflowEntity[],
    transitions: WorkflowTransition[]
  ): WorkflowPath[] {
    const entityIds = new Set(entities.map(e => e.id));

    // Build adjacency list
    const adj = new Map<string, string[]>();

    // Stable sort edge traversal by sorting transition inputs lexicographically
    const sortedTransitions = [...transitions].sort((a, b) => {
      const fromCmp = a.fromEntityId.localeCompare(b.fromEntityId);
      if (fromCmp !== 0) return fromCmp;
      return a.toEntityId.localeCompare(b.toEntityId);
    });

    for (const transition of sortedTransitions) {
      if (entityIds.has(transition.fromEntityId) && entityIds.has(transition.toEntityId)) {
        if (!adj.has(transition.fromEntityId)) {
          adj.set(transition.fromEntityId, []);
        }
        adj.get(transition.fromEntityId)!.push(transition.toEntityId);
      }
    }

    // Stable sort node expansions by sorting adjacent node lists lexicographically
    for (const list of adj.values()) {
      list.sort((a, b) => a.localeCompare(b));
    }

    // Calculate in-degree to find start nodes
    const inDegree = new Map<string, number>();
    for (const id of entityIds) {
      inDegree.set(id, 0);
    }
    for (const transition of sortedTransitions) {
      if (entityIds.has(transition.fromEntityId) && entityIds.has(transition.toEntityId)) {
        inDegree.set(transition.toEntityId, (inDegree.get(transition.toEntityId) || 0) + 1);
      }
    }

    const sortedEntities = Array.from(entityIds).sort((a, b) => a.localeCompare(b));
    let starts = sortedEntities.filter(id => inDegree.get(id) === 0);
    // If purely cyclic, start traversal from every node to ensure coverage
    if (starts.length === 0) {
      starts = sortedEntities;
    }

    const paths: WorkflowPath[] = [];

    const traverse = (currentId: string, currentPath: string[]) => {
      if (paths.length >= MAX_WORKFLOW_PATHS) {
        return;
      }
      currentPath.push(currentId);
      const nextNodes = adj.get(currentId) || [];
      const unvisitedNextNodes = nextNodes.filter(next => !currentPath.includes(next));

      if (unvisitedNextNodes.length === 0) {
        // Leaf or cycle bound reached. Save path if it contains multiple nodes
        if (currentPath.length > 1) {
          if (paths.length < MAX_WORKFLOW_PATHS) {
            paths.push({
              id: `path_${currentPath.join('_')}`,
              entityIds: [...currentPath]
            });
          }
        }
      } else {
        for (const next of unvisitedNextNodes) {
          if (paths.length >= MAX_WORKFLOW_PATHS) {
            break;
          }
          traverse(next, [...currentPath]);
        }
      }
    };

    for (const start of starts) {
      if (paths.length >= MAX_WORKFLOW_PATHS) {
        break;
      }
      traverse(start, []);
    }

    // Stable sort traversal outputs lexicographically by ID for absolute determinism
    return paths.sort((a, b) => a.id.localeCompare(b.id));
  }
}
