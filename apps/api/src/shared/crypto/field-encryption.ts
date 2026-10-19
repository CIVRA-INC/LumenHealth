import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

/** Key-encryption keys by id (32 bytes each, supplied by the KMS) plus the blind-index key. */
export type KeyRing = {
  activeKeyId: string;
  keys: Record<string, Buffer>;
  blindIndexKey: Buffer;
};

export type EncryptedField = {
  v: 1;
  kid: string;
  /** base64(iv | tag | ciphertext) of the per-field data key, wrapped with the KEK `kid`. */
  wrappedKey: string;
  iv: string;
  tag: string;
  ct: string;
};

function seal(key: Buffer, plain: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), ct };
}

function open(key: Buffer, iv: Buffer, tag: Buffer, ct: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

const kek = (ring: KeyRing, kid: string): Buffer => {
  const key = ring.keys[kid];
  if (!key || key.length !== 32) throw new Error(`unknown or invalid key id: ${kid}`);
  return key;
};

/** Envelope encryption: a fresh data key per field, wrapped by the active KEK. */
export function encryptField(plain: string, ring: KeyRing): EncryptedField {
  const dataKey = randomBytes(32);
  const body = seal(dataKey, Buffer.from(plain, 'utf8'));
  const wrapped = seal(kek(ring, ring.activeKeyId), dataKey);
  return {
    v: 1,
    kid: ring.activeKeyId,
    wrappedKey: Buffer.concat([wrapped.iv, wrapped.tag, wrapped.ct]).toString('base64'),
    iv: body.iv.toString('base64'),
    tag: body.tag.toString('base64'),
    ct: body.ct.toString('base64'),
  };
}

function unwrap(field: EncryptedField, ring: KeyRing): Buffer {
  const raw = Buffer.from(field.wrappedKey, 'base64');
  return open(kek(ring, field.kid), raw.subarray(0, 12), raw.subarray(12, 28), raw.subarray(28));
}

export function decryptField(field: EncryptedField, ring: KeyRing): string {
  const dataKey = unwrap(field, ring);
  return open(dataKey, Buffer.from(field.iv, 'base64'), Buffer.from(field.tag, 'base64'), Buffer.from(field.ct, 'base64')).toString('utf8');
}

/** Rotation: re-wraps the data key under the active KEK without touching the ciphertext. */
export function rewrapField(field: EncryptedField, ring: KeyRing): EncryptedField {
  if (field.kid === ring.activeKeyId) return field;
  const wrapped = seal(kek(ring, ring.activeKeyId), unwrap(field, ring));
  return { ...field, kid: ring.activeKeyId, wrappedKey: Buffer.concat([wrapped.iv, wrapped.tag, wrapped.ct]).toString('base64') };
}

/** Deterministic HMAC of the normalized value, for equality lookups without storing plaintext. */
export function blindIndex(value: string, ring: KeyRing): string {
  return createHmac('sha256', ring.blindIndexKey).update(value.trim().toLowerCase()).digest('hex');
}

/** PII_KEYS="id1:<base64>,id2:<base64>", PII_ACTIVE_KEY_ID, PII_BLIND_INDEX_KEY=<base64>. */
export function loadKeyRing(env: NodeJS.ProcessEnv = process.env): KeyRing {
  const keys: Record<string, Buffer> = {};
  for (const pair of (env.PII_KEYS ?? '').split(',').filter(Boolean)) {
    const [id, b64] = pair.split(':');
    keys[id] = Buffer.from(b64, 'base64');
  }
  if (!env.PII_ACTIVE_KEY_ID || !env.PII_BLIND_INDEX_KEY) throw new Error('PII_ACTIVE_KEY_ID and PII_BLIND_INDEX_KEY are required');
  return { activeKeyId: env.PII_ACTIVE_KEY_ID, keys, blindIndexKey: Buffer.from(env.PII_BLIND_INDEX_KEY, 'base64') };
}
