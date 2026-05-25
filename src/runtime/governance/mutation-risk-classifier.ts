import { ReplayMutationPlan, MutationAction } from '../replay/replay-mutation-plan';

export enum MutationRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export class MutationRiskClassifier {
  public classify(plan: ReplayMutationPlan, requestMethod: string): MutationRiskLevel {
    let highestRisk = MutationRiskLevel.LOW;

    // Destructive methods inherently raise the risk baseline
    if (['DELETE'].includes(requestMethod.toUpperCase())) {
      highestRisk = MutationRiskLevel.HIGH;
    } else if (['PUT', 'PATCH', 'POST'].includes(requestMethod.toUpperCase())) {
      // POST/PUT/PATCH could be state mutating
      highestRisk = MutationRiskLevel.MEDIUM;
    }

    for (const action of plan.mutations) {
      const risk = this.classifyAction(action);
      if (risk === MutationRiskLevel.HIGH) {
        return MutationRiskLevel.HIGH;
      }
      if (risk === MutationRiskLevel.MEDIUM) {
        highestRisk = MutationRiskLevel.MEDIUM;
      }
    }

    return highestRisk;
  }

  private classifyAction(action: MutationAction): MutationRiskLevel {
    switch (action.type) {
      case 'AUTH_STRIP':
      case 'ROLE_ELEVATION':
      case 'IDOR_INJECT':
        return MutationRiskLevel.LOW;
      case 'PARAM_POLLUTION':
        return MutationRiskLevel.MEDIUM;
      default:
        return MutationRiskLevel.HIGH;
    }
  }

  public isExecutionAllowed(risk: MutationRiskLevel): boolean {
    // Automatically block HIGH risk mutations
    return risk !== MutationRiskLevel.HIGH;
  }
}
