import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { StaffStatus, UserRole } from '@lumen/types';

const STAFF_STATUSES: StaffStatus[] = ['active', 'deactivated'];
const STAFF_ROLES: UserRole[] = ['owner', 'admin', 'clinician', 'cashier'];

export class ListStaffQueryDto {
  static readonly validationErrorCode = 'VALIDATION_FAILED';

  @IsOptional()
  @IsIn(STAFF_STATUSES, { message: 'status must be active or deactivated' })
  status?: StaffStatus;

  @IsOptional()
  @IsIn(STAFF_ROLES, { message: 'role must be owner, admin, clinician, or cashier' })
  role?: UserRole;

  @IsOptional()
  @IsString({ message: 'q must be a string' })
  @MaxLength(120, { message: 'q must be 120 characters or fewer' })
  q?: string;
}
