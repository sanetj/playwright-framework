import { CognitionSession, CognitionActor } from '../ontology/cognition-primitives';

/**
 * @canonical
 * Authority for tracking runtime session identity, role context, and lineage.
 */
export class RoleSessionManager {
  private activeSessions = new Map<string, CognitionSession>();

  public registerSession(actor: CognitionActor, tags: string[] = []): CognitionSession {
    const session: CognitionSession = {
      sessionId: actor.sessionId,
      actor,
      startedAt: Date.now(),
      lastActive: Date.now(),
      tags,
    };
    this.activeSessions.set(session.sessionId, session);
    return session;
  }

  public getSession(sessionId: string): CognitionSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  public updateActivity(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActive = Date.now();
    }
  }

  public getAllActiveSessions(): CognitionSession[] {
    return Array.from(this.activeSessions.values());
  }

  public getSessionsByRole(role: string): CognitionSession[] {
    return this.getAllActiveSessions().filter(s => s.actor.role === role);
  }
}
