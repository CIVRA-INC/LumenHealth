import { IsString, MinLength, MaxLength, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreateClinicDto {
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
