import { StateSnapshot, StateSignatureEngine } from './state-signature';

export interface StateCluster { id: string; centroid: StateSnapshot; members: string[]; }

export class StateClustering {
  constructor(private readonly engine = new StateSignatureEngine()) {}

  public cluster(snapshots: StateSnapshot[], threshold = 0.85): StateCluster[] {
    const clusters: StateCluster[] = [];
    for (const snap of snapshots) {
      const sig = this.engine.register(snap);
      let matched: StateCluster | undefined;
      for (const c of clusters) {
        if (this.engine.similarity(snap, c.centroid) >= threshold) { matched = c; break; }
      }
      if (!matched) {
        clusters.push({ id: `cluster_${clusters.length + 1}`, centroid: snap, members: [sig] });
      } else {
        matched.members.push(sig);
      }
    }
    return clusters;
  }
}
