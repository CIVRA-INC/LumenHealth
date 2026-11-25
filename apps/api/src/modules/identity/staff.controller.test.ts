import { RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { OrgUserView } from '@lumen/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REQUIRED_PERMISSIONS } from '../../common/decorators';
import type { RequestContext } from '../../common/request-context';
import { StaffController } from './staff.controller';
import type { StaffService } from './staff.service';

const STAFF_ID = '11111111-1111-4111-8111-111111111111';

const ctx: RequestContext = {
  userId: '44444444-4444-4444-8444-444444444444',
  sessionId: 'session-1',
  membershipId: 'membership-admin',
  organizationId: 'org-1',
  timezone: 'Africa/Lagos',
  role: 'ORG_ADMIN',
  permissions: ['users.read', 'users.manage'],
  branchId: 'branch-1',
  accessibleBranchIds: ['branch-1'],
  mustChangePassword: false,
};

const view: OrgUserView = {
  membershipId: STAFF_ID,
  userId: '33333333-3333-4333-8333-333333333333',
  email: 'nurse@lumen.test',
  fullName: 'Test Nurse',
  role: 'NURSE',
  status: 'ACTIVE',
  branches: [{ id: 'branch-1', name: 'Main' }],
  lastLoginAt: null,
};

describe('StaffController (#1457)', () => {
  const staff = {
    deactivate: vi.fn<() => Promise<OrgUserView>>(),
    reactivate: vi.fn<() => Promise<OrgUserView>>(),
  };
  const controller = new StaffController(staff as unknown as StaffService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates deactivation to the service with the request context', async () => {
    staff.deactivate.mockResolvedValue({ ...view, status: 'DISABLED' });

    await expect(controller.deactivate(ctx, STAFF_ID)).resolves.toMatchObject({
      membershipId: STAFF_ID,
      status: 'DISABLED',
    });
    expect(staff.deactivate).toHaveBeenCalledWith(ctx, STAFF_ID);
  });

  it('delegates reactivation to the service with the request context', async () => {
    staff.reactivate.mockResolvedValue(view);

    await expect(controller.reactivate(ctx, STAFF_ID)).resolves.toMatchObject({
      membershipId: STAFF_ID,
      status: 'ACTIVE',
    });
    expect(staff.reactivate).toHaveBeenCalledWith(ctx, STAFF_ID);
  });

  it.each([
    ['deactivate', ':staffId/deactivate'],
    ['reactivate', ':staffId/reactivate'],
  ] as const)('exposes PATCH /%s with users.manage permission', (method, path) => {
    const handler = StaffController.prototype[method];
    const reflector = new Reflector();

    // Both the issue's `/staff` prefix and the current `/admin/users` prefix are supported.
    expect(Reflect.getMetadata('path', StaffController)).toEqual(['staff', 'admin/users']);
    expect(Reflect.getMetadata('path', handler)).toBe(path);
    expect(Reflect.getMetadata('method', handler)).toBe(RequestMethod.PATCH);
    expect(reflector.getAllAndOverride(REQUIRED_PERMISSIONS, [handler, StaffController])).toEqual([
      'users.manage',
    ]);
  });
});
