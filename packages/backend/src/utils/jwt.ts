import jwt from "jsonwebtoken";

export function signToken(
  staffId: string,
  role: string,
  clinicId: string
): string {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign({ id: staffId, role, clinicId }, process.env.JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || "1d",
  });
}
