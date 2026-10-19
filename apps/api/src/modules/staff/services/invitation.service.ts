import { Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import type { Invitation, SendInvitationRequest, UserRole, InvitationStatus } from '@lumen/types';
import { InvitationRepository } from '../repositories/invitation.repository.js';
import { staffStore } from '../repositories/staff.repository.js';
import { identityStore } from '../../auth/repositories/identity.repository.js';
import { authLogger } from '../../../shared/logger/index.js';

const EXPIRY_HOURS = 72;

@Injectable()
export class InvitationService {
  constructor(private readonly invitationRepository: InvitationRepository) {}

  sendInvitation(
    body: SendInvitationRequest,
    clinicId: string,
    invitedBy: string,
  ): { invitation: Invitation } | { error: string; message: string } {
    const existing = this.invitationRepository.findPendingByEmail(clinicId, body.email);
    if (existing) {
      return {
        error: 'INVITATION_ALREADY_PENDING',
        message: 'a pending invitation already exists for this email',
      };
    }

    const existingIdentity = identityStore.findByEmail(body.email);
    if (existingIdentity) {
      return {
        error: 'STAFF_ALREADY_EXISTS',
        message: 'this email is already registered as staff',
      };
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const invitation: Invitation = {
      invitationId: randomUUID(),
      clinicId,
      email: body.email,
      role: body.role as UserRole,
      token: randomBytes(32).toString('hex'),
      status: 'pending',
      invitedBy,
      expiresAt,
      createdAt: now.toISOString(),
    };

    this.invitationRepository.create(invitation);

    authLogger.info('invitation.sent', {
      clinicId,
      requestId: invitation.invitationId,
      meta: { email: invitation.email },
    });

    return { invitation };
  }

  async acceptInvitation(
    token: string,
    password: string,
    _name: string,
  ): Promise<{ ok: true; userId: string } | { error: string; message: string }> {
    // Claim is synchronous, so concurrent accepts cannot both pass.
    const claimed = this.invitationRepository.claim(token);
    if ('error' in claimed) {
      const errors = {
        NOT_FOUND: { error: 'INVITATION_NOT_FOUND', message: 'invitation not found' },
        ACCEPTED: { error: 'INVITATION_ALREADY_ACCEPTED', message: 'invitation has already been accepted' },
        REVOKED: { error: 'INVITATION_REVOKED', message: 'invitation has been revoked' },
        EXPIRED: { error: 'INVITATION_EXPIRED', message: 'invitation has expired' },
      } as const;
      return errors[claimed.error];
    }
    const invitation = claimed.invitation;

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = randomUUID();

    identityStore.save({
      userId,
      clinicId: invitation.clinicId,
      email: invitation.email,
      passwordHash,
      role: invitation.role,
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    const now = new Date().toISOString();
    staffStore.save({
      staffId: randomUUID(),
      clinicId: invitation.clinicId,
      userId,
      name: _name,
      email: invitation.email,
      role: invitation.role,
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    });

    return { ok: true, userId };
  }

  listInvitations(clinicId: string, filter?: { status?: InvitationStatus }) {
    return this.invitationRepository.listByClinic(clinicId, filter);
  }

  revokeInvitation(
    invitationId: string,
    clinicId: string,
  ): { ok: true } | { error: string; message: string } {
    const invitation = this.invitationRepository.findById(invitationId);

    if (!invitation || invitation.clinicId !== clinicId) {
      return { error: 'INVITATION_NOT_FOUND', message: 'invitation not found' };
    }
    if (invitation.status === 'accepted') {
      return {
        error: 'INVITATION_ALREADY_ACCEPTED',
        message: 'cannot revoke an already accepted invitation',
      };
    }

    this.invitationRepository.save({ ...invitation, status: 'revoked' });
    return { ok: true };
  }
}
