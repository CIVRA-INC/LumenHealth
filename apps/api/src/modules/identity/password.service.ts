import { Injectable } from '@nestjs/common';
import { Algorithm, hash, verify } from '@node-rs/argon2';

// Argon2id with the OWASP-recommended minimum cost (19 MiB, 2 passes, 1 lane).
const OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService {
  /** Hash of a throwaway password, verified against when the account does not exist to equalise timing. */
  private decoyHash: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  async verifyDecoy(password: string): Promise<void> {
    this.decoyHash ??= this.hash('decoy-password-for-timing-equalisation');
    await this.verify(await this.decoyHash, password);
  }
}
