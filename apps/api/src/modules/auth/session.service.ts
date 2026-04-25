import bcrypt from "bcryptjs";
import { UserModel } from "./models/user.model";
import { signAccessToken, signRefreshToken, TokenUser } from "./token.service";

export interface LoginCredentials {
  email: string;
  password: string;
  deviceId?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Constant-time rejection prevents timing-based account enumeration
const DUMMY_HASH = "$2a$12$invalidhashpaddingtoensureconstanttimerejectionsXXXXXXXX";

async function verifyPassword(plain: string, hash: string | undefined): Promise<boolean> {
  // Always run bcrypt.compare even when no user found to prevent timing attacks
  return bcrypt.compare(plain, hash ?? DUMMY_HASH);
}

function buildTokenUser(user: { id: string; role: string; clinicId: unknown }): TokenUser {
  return {
    userId: user.id,
    role: user.role as TokenUser["role"],
    clinicId: String(user.clinicId),
  };
}

export async function issueSession(credentials: LoginCredentials): Promise<SessionTokens> {
  const email = credentials.email.toLowerCase().trim();
  const user = await UserModel.findOne({ email });

  const passwordValid = await verifyPassword(
    credentials.password,
    user?.password,
  );

  if (!user || !user.isActive || !passwordValid) {
    throw Object.assign(new Error("Invalid email or password"), {
      code: "INVALID_CREDENTIALS",
      status: 401,
    });
  }

  const tokenUser = buildTokenUser(user);

  return {
    accessToken: signAccessToken(tokenUser),
    refreshToken: signRefreshToken(tokenUser),
    expiresIn: 900, // 15 minutes in seconds
  };
}
