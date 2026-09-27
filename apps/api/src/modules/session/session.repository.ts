import { Injectable } from '@nestjs/common';

export interface SessionData {
  sessionId: string;
  userId: string;
  expiresAt: number;
}

@Injectable()
export class SessionRepository {
  private sessions = new Map<string, SessionData>();

  public createSession(data: SessionData): SessionData {
    this.sessions.set(data.sessionId, data);
    return data;
  }

  public findSession(sessionId: string): SessionData | undefined {
    return this.sessions.get(sessionId);
  }

  public deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}

@Injectable()
export class IdentityRepository {
  private identities = new Map<string, { id: string; email: string }>();

  public findById(id: string) {
    return this.identities.get(id);
  }
}
