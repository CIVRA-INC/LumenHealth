import bcrypt from "bcryptjs";
import { UserModel } from "./models/user.model";
import { AppRole } from "../../types/express";

const SELF_REGISTERABLE_ROLES: AppRole[] = ["DOCTOR", "NURSE", "ASSISTANT", "READ_ONLY"];
const PRIVILEGED_ROLES: AppRole[] = ["SUPER_ADMIN", "CLINIC_ADMIN"];

export interface RegisterDto {
  fullName: string;
  email: string;
  password: string;
  role: AppRole;
  clinicId: string;
}

export interface RegistrationResult {
  userId: string;
  email: string;
  role: AppRole;
}

function isRoleSafeForSelfRegistration(role: AppRole): boolean {
  return SELF_REGISTERABLE_ROLES.includes(role);
}

export function assertPrivilegedRoleRequiresElevation(role: AppRole): void {
  if (PRIVILEGED_ROLES.includes(role)) {
    throw Object.assign(new Error("Privileged role requires admin provisioning"), {
      code: "ROLE_ELEVATION_REQUIRED",
      status: 403,
    });
  }
}

export async function assertEmailNotTaken(email: string): Promise<void> {
  const normalised = email.toLowerCase().trim();
  const existing = await UserModel.findOne({ email: normalised });
  if (existing) {
    // Generic message to prevent account enumeration
    throw Object.assign(new Error("Registration failed"), {
      code: "REGISTRATION_FAILED",
      status: 409,
    });
  }
}

export async function registerUser(dto: RegisterDto): Promise<RegistrationResult> {
  if (!isRoleSafeForSelfRegistration(dto.role)) {
    assertPrivilegedRoleRequiresElevation(dto.role);
  }

  await assertEmailNotTaken(dto.email);

  const user = await UserModel.create({
    fullName: dto.fullName.trim(),
    email: dto.email.toLowerCase().trim(),
    password: dto.password, // hashed by pre-save hook
    role: dto.role,
    clinicId: dto.clinicId,
    isActive: true,
  });

  return { userId: String(user._id), email: user.email, role: user.role };
}
