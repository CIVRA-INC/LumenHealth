type TokenPayload = {
  sub: string;
  clinicId: string;
  role: string;
  kid: string;
};

export interface AccessTokenSigner {
  sign(payload: Omit<TokenPayload, "kid">): string;
  keyId(): string;
}

export class StaticKeyAccessTokenSigner implements AccessTokenSigner {
  constructor(private readonly signingKey: string, private readonly kidValue = "k1") {}

  sign(payload: Omit<TokenPayload, "kid">): string {
    const tokenPayload: TokenPayload = { ...payload, kid: this.kidValue };
    const encoded = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");
    const sig = Buffer.from(`${encoded}.${this.signingKey}`).toString("base64url");
    return `${encoded}.${sig}`;
  }

  keyId(): string {
    return this.kidValue;
  }
}

export const accessTokenSigner: AccessTokenSigner = new StaticKeyAccessTokenSigner(
  process.env.AUTH_ACCESS_TOKEN_KEY ?? "dev-local-key",
  process.env.AUTH_ACCESS_TOKEN_KID ?? "k1"
);
