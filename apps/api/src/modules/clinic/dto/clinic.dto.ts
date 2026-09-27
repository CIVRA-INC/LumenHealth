import { IsString, MinLength, MaxLength, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

/**
 * Error code returned when one of these DTOs fails validation.
 *
 * Read by `createGlobalValidationPipe()` (src/shared/validation/) via
 * `error.target.constructor`, so the app-wide pipe keeps the clinic-specific
 * error vocabulary that the module-level pipe already used.
 */
const VALIDATION_ERROR_CODE = "CLINIC_INVALID_INPUT";

export class CreateClinicDto {
  static readonly validationErrorCode = VALIDATION_ERROR_CODE;

  @IsString({ message: "name must be at least 2 characters" })
  @MinLength(2, { message: "name must be at least 2 characters" })
  @MaxLength(120, { message: "name must be 120 characters or fewer" })
  name!: string;

  @IsString({ message: "address is required" })
  @IsNotEmpty({ message: "address is required" })
  address!: string;

  @IsString({ message: "phone is required" })
  @IsNotEmpty({ message: "phone is required" })
  phone!: string;

  @IsString({ message: "a valid email is required" })
  @IsEmail({}, { message: "a valid email is required" })
  email!: string;
}

export class UpdateClinicDto {
  static readonly validationErrorCode = VALIDATION_ERROR_CODE;

  @IsOptional()
  @IsString({ message: "name must be at least 2 characters" })
  @MinLength(2, { message: "name must be at least 2 characters" })
  @MaxLength(120, { message: "name must be 120 characters or fewer" })
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString({ message: "a valid email is required" })
  @IsEmail({}, { message: "a valid email is required" })
  email?: string;
}
