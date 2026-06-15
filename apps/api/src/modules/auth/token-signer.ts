import jwt from "jsonwebtoken";

type TokenPayload = {
  sub: string;
  clinicId: string;
  role: string;
};

export interface AccessTokenSigner {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload | null;
}

export class JwtAccessTokenSigner implements AccessTokenSigner {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string = "15m"
  ) {}

  sign(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, {
      algorithm: "HS256",
      expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"],
    });
  }

  verify(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch {
      return null;
    }
  }
}

export const accessTokenSigner: AccessTokenSigner = new JwtAccessTokenSigner(
  process.env.AUTH_ACCESS_TOKEN_KEY ?? "dev-local-secret-change-in-production"
);
