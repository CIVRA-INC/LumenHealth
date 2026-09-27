import { IsString, IsEmail, MinLength, Matches, IsIn } from 'class-validator';
import type { UserRole } from '@lumen/types';

const ASSIGNABLE_ROLES = ["admin", "clinician", "cashier"];

/**
 * Error code returned when one of these DTOs fails validation.
 *
 * Read by `createGlobalValidationPipe()` (src/shared/validation/) via
 * `error.target.constructor`, so the app-wide pipe keeps the
 * invitation-specific error vocabulary that the module-level pipe already used.
 */
const VALIDATION_ERROR_CODE = "INVITATION_INVALID_INPUT";

export class SendInvitationDto {
  static readonly validationErrorCode = VALIDATION_ERROR_CODE;

  @IsEmail({}, { message: "a valid email is required" })
  email!: string;

  @IsString()
  @IsIn(ASSIGNABLE_ROLES, { message: `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}` })
  role!: UserRole;
}

export class AcceptInvitationDto {
  static readonly validationErrorCode = VALIDATION_ERROR_CODE;

  @IsString({ message: "token is required" })
  @MinLength(1, { message: "token is required" })
  token!: string;

  @IsString({ message: "name must be at least 2 characters" })
  @MinLength(2, { message: "name must be at least 2 characters" })
  name!: string;

  @IsString({ message: "password is required" })
  @MinLength(8, { message: "password must be at least 8 characters" })
  @Matches(/[A-Z]/, { message: "password must contain at least one uppercase letter" })
  @Matches(/[0-9]/, { message: "password must contain at least one number" })
  password!: string;
}
