import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Invitation, InvitationStatus } from "@lumen/types";

const copy = <T>(value: T): T => structuredClone(value);

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class InvitationRepository {
  private store = new Map<string, Invitation>();
  private tokenIndex = new Map<string, string>(); // token → invitationId

  /** New invitation: only the token hash is stored; the caller keeps the raw token. */
  create(inv: Invitation): Invitation {
    this.store.set(inv.invitationId, { ...copy(inv), token: hashToken(inv.token) });
    this.tokenIndex.set(hashToken(inv.token), inv.invitationId);
    return copy(inv);
  }

  save(inv: Invitation): Invitation {
    this.store.set(inv.invitationId, copy(inv));
    return copy(inv);
  }

  rotateToken(invitationId: string, newToken: string, expiresAt: string): Invitation | undefined {
    const existing = this.store.get(invitationId);
    if (!existing) return undefined;
    for (const [hash, id] of this.tokenIndex.entries()) {
      if (id === invitationId) this.tokenIndex.delete(hash);
    }
    const updated: Invitation = { ...existing, token: hashToken(newToken), expiresAt, status: 'pending' };
    this.store.set(invitationId, copy(updated));
    this.tokenIndex.set(hashToken(newToken), invitationId);
    return { ...copy(updated), token: newToken };
  }

  /** The one pending, unexpired invitation for (clinic, email), if any. */
  findPendingByEmail(clinicId: string, email: string): Invitation | undefined {
    const now = Date.now();
    const found = Array.from(this.store.values()).find(
      (inv) =>
        inv.clinicId === clinicId &&
        inv.email.toLowerCase() === email.toLowerCase() &&
        inv.status === 'pending' &&
        new Date(inv.expiresAt).getTime() > now,
    );
    return found ? copy(found) : undefined;
  }

  /** Atomically (synchronously) marks a pending, unexpired invitation accepted; a second claim finds it accepted. */
  claim(token: string): { invitation: Invitation } | { error: 'NOT_FOUND' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED' } {
    const inv = this.findByToken(token);
    if (!inv) return { error: 'NOT_FOUND' };
    if (inv.status === 'accepted') return { error: 'ACCEPTED' };
    if (inv.status === 'revoked') return { error: 'REVOKED' };
    if (new Date(inv.expiresAt).getTime() <= Date.now()) return { error: 'EXPIRED' };
    const accepted: Invitation = { ...inv, status: 'accepted', acceptedAt: new Date().toISOString() };
    this.store.set(inv.invitationId, copy(accepted));
    return { invitation: accepted };
  }

  findById(invitationId: string): Invitation | undefined {
    const found = this.store.get(invitationId);
    return found ? copy(found) : undefined;
  }

  findByToken(token: string): Invitation | undefined {
    const id = this.tokenIndex.get(hashToken(token));
    const found = id ? this.store.get(id) : undefined;
    return found ? copy(found) : undefined;
  }

  findByEmail(clinicId: string, email: string): Invitation | undefined {
    const found = Array.from(this.store.values()).find(
      (inv) => inv.clinicId === clinicId && inv.email === email
    );
    return found ? copy(found) : undefined;
  }

  listByClinic(clinicId: string, filter?: { status?: InvitationStatus }): Invitation[] {
    return Array.from(this.store.values())
      .filter((inv) => inv.clinicId === clinicId && (!filter?.status || inv.status === filter.status))
      .map(copy);
  }

  _reset(): void {
    this.store.clear();
    this.tokenIndex.clear();
  }
}

export const invitationStore = new InvitationRepository();
