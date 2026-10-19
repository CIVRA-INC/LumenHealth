import bcrypt from "bcryptjs";

/**
 * Login timing equalizer (#1341).
 *
 * A precomputed bcrypt hash (cost 12) of a throwaway value. It matches the
 * cost and format of every application password hash in the tree today
 * (`invitation.service` hashes with `bcrypt.hash(password, 12)`, the auth
 * test fixtures embed a `$2b$12$…` hash). The result of comparing against it
 * is discarded — it exists solely so an unknown-email login performs the
 * same bcrypt work as a wrong-password login (docs/auth-threat-model.md T7).
 *
 * If `BCRYPT_ROUNDS` / the invitation hashing cost ever changes, regenerate
 * this constant so the dummy work stays cost-equivalent to a real compare.
 */
export const DUMMY_PASSWORD_HASH = "$2b$12$Rth/25XlQZ/.iAVmWi9aMuaUbuE81wM3xPip73XcLEkyIYeV5NkJm";

/**
 * Burn one bcrypt compare's worth of CPU when the login handler looks up an
 * email that does not exist, so response timing cannot distinguish
 * "unknown email" from "wrong password". Never throws; the outcome is
 * intentionally discarded.
 */
export async function performDummyPasswordCompare(password: string): Promise<void> {
  try {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
  } catch {
    // bcrypt.compare only rejects on malformed input the handler controls;
    // timing equalization must never turn a lookup miss into a 500.
  }
}
