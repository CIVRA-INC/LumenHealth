import type { AuthIdentity } from "../types/index.js";

/** Contract that both the in-memory and the database identity stores implement. */
export interface IdentityRepository {
  findByEmail(email: string): AuthIdentity | undefined;
  findById(userId: string): AuthIdentity | undefined;
  save(identity: AuthIdentity): void;
  _reset(): void;
}
