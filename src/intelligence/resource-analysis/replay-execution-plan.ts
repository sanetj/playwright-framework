export interface ReplayExecutionPlan {
  readonly planId: string;
  readonly bundleId: string;
  readonly assemblyId: string;
  readonly baselineExchangeId: string;
  readonly subjectAuthContext: string;
  
  readonly ownerResourceContext: {
    readonly ownerId: string;
    readonly targetResourceId: string;
  };
  
  readonly allowedMethod: 'GET' | 'HEAD';
  readonly targetResourceFamily: string;
  readonly targetResourceId: string;
  readonly replayCandidateId: string;

  /**
   * Request template details containing clean headers, paths, and payloads.
   */
  readonly requestTemplate: {
    readonly method: 'GET' | 'HEAD';
    readonly pathTemplate: string;
    readonly concretePath: string;
    readonly headers: readonly { name: string; value: string }[];
    readonly bodyStr?: string;
  };
}

export interface ReplayExecutionPlanInventory {
  readonly plans: readonly ReplayExecutionPlan[];
}
