import { RouteNode, WorkflowStep } from '../../models/schema';

export class WorkflowDerivationEngine {
  public infer(routeNodes: RouteNode[], rawSteps: WorkflowStep[]): WorkflowStep[] {
    const authRoutes = routeNodes.filter((r) => /login|signin|auth|account/i.test(r.url)).map((r) => r.url);
    return rawSteps.map((step) => ({
      ...step,
      requiresAuth: authRoutes.some((r) => step.routeId.includes(r)) || /checkout|admin|settings/i.test(step.action),
    }));
  }
}
