import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes with argon2id and verifies', async () => {
    const hash = await service.hash('a-long-test-passphrase');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await service.verify(hash, 'a-long-test-passphrase')).toBe(true);
    expect(await service.verify(hash, 'a-different-passphrase')).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await service.hash('same-passphrase-1')).not.toBe(
      await service.hash('same-passphrase-1'),
    );
  });

  it('treats a malformed stored hash as a failed verification rather than throwing', async () => {
    expect(await service.verify('not-a-hash', 'anything')).toBe(false);
  });
});
