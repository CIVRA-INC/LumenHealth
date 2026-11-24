import { describe, expect, it } from 'vitest';
import { nameKey, normalizeIdentifier, normalizeName } from './patient.mapper';

describe('duplicate-detection keys', () => {
  it('ignores case, accents, spaces and punctuation', () => {
    expect(normalizeName('Ọlá-Bánjo')).toBe('olabanjo');
    expect(nameKey('Ola', 'BANJO')).toBe(nameKey('ọlá', 'Bánjo'));
  });

  it('keeps given and family names distinct', () => {
    expect(nameKey('Amina', 'Bello')).not.toBe(nameKey('Bello', 'Amina'));
  });

  it('normalises identifiers', () => {
    expect(normalizeIdentifier(' a123 456 ')).toBe('A123456');
  });
});
