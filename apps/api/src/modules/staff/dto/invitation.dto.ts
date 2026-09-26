import { IsString, IsEmail, MinLength, Matches, IsIn } from 'class-validator';
import type { UserRole } from '@lumen/types';

const ASSIGNABLE_ROLES = ["admin", "clinician", "cashier"];

export class SendInvitationDto {
  @IsEmail({}, { message: "a valid email is required" })
  email!: string;

  @IsString()
  @IsIn(ASSIGNABLE_ROLES, { message: `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}` })
  role!: UserRole;
}

export class AcceptInvitationDto {
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
