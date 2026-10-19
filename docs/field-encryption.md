# Field-level encryption for PII

`apps/api/src/shared/crypto/field-encryption.ts` provides envelope encryption:

- Each field gets a fresh 256-bit data key and is sealed with AES-256-GCM.
- The data key is wrapped with a key-encryption key (KEK) from the KMS, identified by `kid`.
- `blindIndex(value)` is an HMAC-SHA256 of the normalized value, stored next to the ciphertext so
  equality lookups (such as email) work without plaintext in the database.

Configuration: `PII_KEYS` (`id:base64` pairs), `PII_ACTIVE_KEY_ID`, `PII_BLIND_INDEX_KEY`.

## Rotation

1. Add the new KEK to `PII_KEYS` and set it as `PII_ACTIVE_KEY_ID`; keep the old one.
2. Run `rewrapField` over stored fields; ciphertext is untouched, only the wrapped data key changes.
3. Remove the old KEK once no field references its `kid`.

Rotating `PII_BLIND_INDEX_KEY` requires recomputing every blind index.
