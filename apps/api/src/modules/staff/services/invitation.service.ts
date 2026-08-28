import { randomBytes, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import type { Invitation, SendInvitationRequest, UserRole } from '@lumen/types';
import { invitationStore } from '../repositories/invitation.repository.js';
import { identityStore } from '../../auth/repositories/identity.repository.js';
import { authLogger } from '../../../shared/logger/index.js';
import { recordAudit } from '../../audit/services/audit.service.js';
import type { RequestAuditMeta } from '../../../shared/http/audit-meta.js';

const EXPIRY_HOURS = 72;

export function sendInvitation(
  body: SendInvitationRequest,
  clinicId: string,
  invitedBy: string,
  invitedByRole: UserRole,
  meta: RequestAuditMeta = {},
): { invitation: Invitation } | { error: string; message: string } {
  const existing = invitationStore.findByEmail(clinicId, body.email);
  if (existing?.status === 'pending') {
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

  invitationStore.save(invitation);

  recordAudit({
    clinicId,
    action: 'staff.invited',
    actorId: invitedBy,
    actorRole: invitedByRole,
    targetId: invitation.invitationId,
    targetType: 'invitation',
    after: { email: invitation.email, role: invitation.role },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  authLogger.info('invitation.sent', {
    clinicId,
    requestId: invitation.invitationId,
    meta: { email: invitation.email },
  });

  return { invitation };
}

export async function acceptInvitation(
  token: string,
  password: string,
  _name: string,
  meta: RequestAuditMeta = {},
): Promise<{ ok: true; userId: string } | { error: string; message: string }> {
  const invitation = invitationStore.findByToken(token);

  if (!invitation) {
    return { error: 'INVITATION_NOT_FOUND', message: 'invitation not found' };
  }
  if (invitation.status === 'accepted') {
    return {
      error: 'INVITATION_ALREADY_ACCEPTED',
      message: 'invitation has already been accepted',
    };
  }
  if (invitation.status === 'revoked') {
    return {
      error: 'INVITATION_REVOKED',
      message: 'invitation has been revoked',
    };
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    return { error: 'INVITATION_EXPIRED', message: 'invitation has expired' };
  }

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

  invitationStore.save({
    ...invitation,
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
  });

  // The actor here is the invitee accepting on their own behalf — this path is
  // unauthenticated (token-based), so the role comes from the invitation itself.
  recordAudit({
    clinicId: invitation.clinicId,
    action: 'staff.invitation_accepted',
    actorId: userId,
    actorRole: invitation.role,
    targetId: invitation.invitationId,
    targetType: 'invitation',
    after: { email: invitation.email, role: invitation.role },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { ok: true, userId };
}

export function revokeInvitation(
  invitationId: string,
  clinicId: string,
  actorId: string,
  actorRole: UserRole,
  meta: RequestAuditMeta = {},
): { ok: true } | { error: string; message: string } {
  const invitation = invitationStore.findById(invitationId);

  if (!invitation || invitation.clinicId !== clinicId) {
    return { error: 'INVITATION_NOT_FOUND', message: 'invitation not found' };
  }
  if (invitation.status === 'accepted') {
    return {
      error: 'INVITATION_ALREADY_ACCEPTED',
      message: 'cannot revoke an already accepted invitation',
    };
  }

  invitationStore.save({ ...invitation, status: 'revoked' });

  recordAudit({
    clinicId,
    action: 'staff.invitation_revoked',
    actorId,
    actorRole,
    targetId: invitation.invitationId,
    targetType: 'invitation',
    before: { email: invitation.email, status: invitation.status },
    after: { status: 'revoked' },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { ok: true };
}
