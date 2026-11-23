import { Injectable } from '@nestjs/common';
import { randomBytes, randomUUID, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import type { Invitation, InvitationError, SendInvitationRequest, UserRole, InvitationStatus } from '@lumen/types';
import { InvitationRepository } from '../repositories/invitation.repository.js';
import { staffStore } from '../repositories/staff.repository.js';
import { identityStore, DuplicateEmailError } from '../../auth/repositories/identity.repository.js';
import { paginateByCursor } from '../../../shared/pagination/cursor.js';
import { authLogger } from '../../../shared/logger/index.js';
import { RolePolicyService } from '../../../shared/role-policy/role-policy.service.js';

const EXPIRY_HOURS = 72;

@Injectable()
export class InvitationService {
  private readonly rolePolicy: RolePolicyService;
  constructor(
    private readonly invitationRepository: InvitationRepository,
    rolePolicy?: RolePolicyService,
  ) {
    this.rolePolicy = rolePolicy ?? new RolePolicyService();
  }

  sendInvitation(
    body: SendInvitationRequest,
    clinicId: string,
    invitedBy: string,
    requestId?: string,
  ): { invitation: Invitation } | InvitationError {
    const existing = this.invitationRepository.findPendingByEmail(clinicId, body.email);
    if (existing) {
      return {
        error: 'INVITATION_ALREADY_PENDING',
        message: 'a pending invitation already exists for this email',
      };
    }

    const existingIdentity = identityStore.findByEmail(body.email);
    if (existingIdentity && existingIdentity.clinicId === clinicId) {
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
      requestId: requestId ?? randomUUID(),
      meta: {
        invitationId: invitation.invitationId,
        role: invitation.role,
        emailHash: createHash('sha256').update(invitation.email.toLowerCase()).digest('hex').slice(0, 16),
      },
    });

    return { invitation };
  }

  async acceptInvitation(
    token: string,
    password: string,
    name: string,
  ): Promise<{ ok: true; userId: string } | InvitationError> {
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

    try {
      identityStore.save({
        userId,
        clinicId: invitation.clinicId,
        email: invitation.email,
        name: name.trim(),
        passwordHash,
        role: invitation.role,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof DuplicateEmailError) {
        return { error: 'INVITATION_ALREADY_ACCEPTED', message: 'invitation could not be accepted' };
      }
      throw err;
    }

    const now = new Date().toISOString();
    staffStore.save({
      staffId: randomUUID(),
      clinicId: invitation.clinicId,
      userId,
      name: name.trim(),
      email: invitation.email,
      role: invitation.role,
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    });

    authLogger.info('invitation.accepted', {
      clinicId: invitation.clinicId,
      userId,
      meta: { invitationId: invitation.invitationId, role: invitation.role },
    });

    return { ok: true, userId };
  }

  listInvitations(clinicId: string, filter?: { status?: InvitationStatus }) {
    return this.invitationRepository.listByClinic(clinicId, filter);
  }

  listInvitationsPage(clinicId: string, opts: { cursor?: string; limit?: number; status?: InvitationStatus } = {}) {
    const sorted = this.invitationRepository
      .listByClinic(clinicId, opts.status ? { status: opts.status } : undefined)
      .sort((a, b) => `${b.createdAt}|${b.invitationId}`.localeCompare(`${a.createdAt}|${a.invitationId}`));
    return paginateByCursor(sorted, (i) => `${i.createdAt}|${i.invitationId}`, opts.cursor, opts.limit);
  }

  revokeInvitation(
    invitationId: string,
    clinicId: string,
    requestId?: string,
    actorId?: string,
  ): { ok: true } | InvitationError {
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
    authLogger.info('invitation.revoked', {
      clinicId,
      requestId: requestId ?? randomUUID(),
      userId: actorId,
      meta: { invitationId, role: invitation.role },
    });
    return { ok: true };
  }

  resendInvitation(
    invitationId: string,
    clinicId: string,
  ): { invitation: Invitation } | InvitationError {
    const invitation = this.invitationRepository.findById(invitationId);
    if (!invitation || invitation.clinicId !== clinicId) {
      return { error: 'INVITATION_NOT_FOUND', message: 'invitation not found' };
    }
    if (invitation.status === 'accepted' || invitation.status === 'revoked') {
      return { error: invitation.status === 'accepted' ? 'INVITATION_ALREADY_ACCEPTED' : 'INVITATION_REVOKED', message: `invitation is ${invitation.status}` };
    }
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
    const token = randomBytes(32).toString('hex');
    const updated = this.invitationRepository.rotateToken(invitationId, token, expiresAt);
    if (!updated) {
      return { error: 'INVITATION_NOT_FOUND', message: 'invitation not found' };
    }
    return { invitation: updated };
  }
}
