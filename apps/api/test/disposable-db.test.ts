import { describe, expect, it } from 'vitest';
import { deriveUrl, disposableTarget } from '../prisma/disposable-db';

const url = (db: string) => `postgresql://lumen:secret@localhost:5432/${db}`;

describe('disposable databases', () => {
  it('accepts only a database named for the purpose', () => {
    expect(disposableTarget(url('lumenhealth_e2e'), '_e2e').name).toBe('lumenhealth_e2e');
    expect(disposableTarget(url('lumenhealth_visual'), '_visual').name).toBe('lumenhealth_visual');
  });

  it('refuses the development, test and production-like names, and a missing URL', () => {
    for (const name of ['lumenhealth', 'lumenhealth_test', 'lumenhealth_prod', 'postgres']) {
      expect(() => disposableTarget(url(name), '_e2e')).toThrow(/Refusing to reset/);
      expect(() => disposableTarget(url(name), '_visual')).toThrow(/Refusing to reset/);
    }
    // One disposable name is not accepted for the other purpose.
    expect(() => disposableTarget(url('lumenhealth_e2e'), '_visual')).toThrow(/Refusing/);
    expect(() => disposableTarget(undefined, '_e2e')).toThrow(/No database URL/);
  });

  it('refuses a remote host even when the name is right', () => {
    const remote = 'postgresql://lumen:secret@db.example.com:5432/lumenhealth_e2e';
    expect(() => disposableTarget(remote, '_e2e')).toThrow(/only a database on this machine/);
  });

  it('derives the visual database from the end-to-end one without touching anything else', () => {
    expect(deriveUrl(url('lumenhealth_e2e'), '_e2e', '_visual')).toBe(url('lumenhealth_visual'));
    expect(() => deriveUrl(url('lumenhealth'), '_e2e', '_visual')).toThrow();
  });
});
