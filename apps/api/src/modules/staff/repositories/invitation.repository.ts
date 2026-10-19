import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Invitation, InvitationStatus } from "@lumen/types";

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class InvitationRepository {
  private store = new Map<string, Invitation>();
  private tokenIndex = new Map<string, string>(); // token → invitationId

  /** New invitation: only the token hash is stored; the caller keeps the raw token. */
  create(inv: Invitation): Invitation {
    this.store.set(inv.invitationId, { ...inv, token: hashToken(inv.token) });
    this.tokenIndex.set(hashToken(inv.token), inv.invitationId);
    return inv;
  }

  save(inv: Invitation): Invitation {
    this.store.set(inv.invitationId, inv);
    return inv;
  }

  /** The one pending, unexpired invitation for (clinic, email), if any. */
  findPendingByEmail(clinicId: string, email: string): Invitation | undefined {
    const now = Date.now();
    return Array.from(this.store.values()).find(
      (inv) =>
        inv.clinicId === clinicId &&
        inv.email.toLowerCase() === email.toLowerCase() &&
        inv.status === 'pending' &&
        new Date(inv.expiresAt).getTime() > now,
    );
  }

  /** Atomically (synchronously) marks a pending, unexpired invitation accepted; a second claim finds it accepted. */
  claim(token: string): { invitation: Invitation } | { error: 'NOT_FOUND' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED' } {
    const inv = this.findByToken(token);
    if (!inv) return { error: 'NOT_FOUND' };
    if (inv.status === 'accepted') return { error: 'ACCEPTED' };
    if (inv.status === 'revoked') return { error: 'REVOKED' };
    if (new Date(inv.expiresAt).getTime() <= Date.now()) return { error: 'EXPIRED' };
    const accepted: Invitation = { ...inv, status: 'accepted', acceptedAt: new Date().toISOString() };
    this.store.set(inv.invitationId, accepted);
    return { invitation: accepted };
  }

  findById(invitationId: string): Invitation | undefined {
    return this.store.get(invitationId);
  }

  findByToken(token: string): Invitation | undefined {
    const id = this.tokenIndex.get(hashToken(token));
    return id ? this.store.get(id) : undefined;
  }

  findByEmail(clinicId: string, email: string): Invitation | undefined {
    return Array.from(this.store.values()).find(
      (inv) => inv.clinicId === clinicId && inv.email === email
    );
  }

  listByClinic(clinicId: string, filter?: { status?: InvitationStatus }): Invitation[] {
    return Array.from(this.store.values()).filter(
      (inv) => inv.clinicId === clinicId && (!filter?.status || inv.status === filter.status)
    );
  }

  _reset(): void {
    this.store.clear();
    this.tokenIndex.clear();
  }
}

export const invitationStore = new InvitationRepository();
