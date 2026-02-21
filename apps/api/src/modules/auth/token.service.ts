import jwt, { JwtPayload } from "jsonwebtoken";
import { config } from "@lumen/config";
import { AppRole, AuthenticatedUser } from "../../types/express";

export interface TokenUser {
  userId: string;
  role: AppRole;
  clinicId: string;
}

export interface AccessTokenPayload extends JwtPayload, TokenUser {
  tokenType: "access";
}

export interface RefreshTokenPayload extends JwtPayload, TokenUser {
  tokenType: "refresh";
}

const accessTokenSecret = config.jwt.accessTokenSecret;
const refreshTokenSecret = config.jwt.refreshTokenSecret;

if (!accessTokenSecret || !refreshTokenSecret) {
  throw new Error("JWT secrets are required");
}

export const signAccessToken = (user: TokenUser): string =>
  jwt.sign(
    { ...user, tokenType: "access" },
    accessTokenSecret,
    { expiresIn: "15m" },
  );

export const signRefreshToken = (user: TokenUser): string =>
  jwt.sign(
    { ...user, tokenType: "refresh" },
    refreshTokenSecret,
    { expiresIn: "7d" },
  );

const isPayloadObject = (payload: string | JwtPayload): payload is JwtPayload =>
  typeof payload !== "string";

export const verifyAccessToken = (token: string): AuthenticatedUser | null => {
  try {
    const decoded = jwt.verify(token, accessTokenSecret);
    if (!isPayloadObject(decoded)) {
      return null;
    }

    if (
      decoded.tokenType !== "access" ||
      typeof decoded.userId !== "string" ||
      typeof decoded.role !== "string" ||
      typeof decoded.clinicId !== "string"
    ) {
      return null;
    }

    return {
      userId: decoded.userId,
      role: decoded.role as AppRole,
      clinicId: decoded.clinicId,
    };
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): TokenUser | null => {
  try {
    const decoded = jwt.verify(token, refreshTokenSecret);
    if (!isPayloadObject(decoded)) {
      return null;
    }

    if (
      decoded.tokenType !== "refresh" ||
      typeof decoded.userId !== "string" ||
      typeof decoded.role !== "string" ||
      typeof decoded.clinicId !== "string"
    ) {
      return null;
    }

    return {
      userId: decoded.userId,
      role: decoded.role as AppRole,
      clinicId: decoded.clinicId,
    };
  } catch {
    return null;
  }
};
