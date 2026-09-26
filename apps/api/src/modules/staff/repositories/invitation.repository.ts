import { Injectable } from '@nestjs/common';
import type { Invitation, InvitationStatus } from "@lumen/types";

@Injectable()
export class InvitationRepository {
  private store = new Map<string, Invitation>();
  private tokenIndex = new Map<string, string>(); // token → invitationId

  save(inv: Invitation): Invitation {
    this.store.set(inv.invitationId, inv);
    this.tokenIndex.set(inv.token, inv.invitationId);
    return inv;
  }

  findById(invitationId: string): Invitation | undefined {
    return this.store.get(invitationId);
  }

  findByToken(token: string): Invitation | undefined {
    const id = this.tokenIndex.get(token);
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
