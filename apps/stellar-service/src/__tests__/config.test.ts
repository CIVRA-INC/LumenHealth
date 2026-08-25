import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  loadAnchorAccountPublicKey,
  loadAnchorCosignerKeypairs,
  loadAnchorRequiredWeight,
  loadAnchorMultisigSetup,
  loadExportSigningKeypair,
  loadSigningKeyRegistry,
} from "../config.js";

const ENV_KEYS = [
  "STELLAR_ANCHOR_ACCOUNT_PUBLIC_KEY",
  "STELLAR_ANCHOR_COSIGNER_SECRETS",
  "STELLAR_ANCHOR_REQUIRED_WEIGHT",
  "STELLAR_EXPORT_SIGNING_SECRET",
  "STELLAR_SIGNING_KEY_REGISTRY_JSON",
] as const;

let originalEnv: Record<string, string | undefined>;

beforeEach(() => {
  originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("loadAnchorAccountPublicKey", () => {
  it("throws when the env var is missing", () => {
    delete process.env.STELLAR_ANCHOR_ACCOUNT_PUBLIC_KEY;
    expect(() => loadAnchorAccountPublicKey()).toThrow(/STELLAR_ANCHOR_ACCOUNT_PUBLIC_KEY/);
  });

  it("returns the configured public key", () => {
    const publicKey = Keypair.random().publicKey();
    process.env.STELLAR_ANCHOR_ACCOUNT_PUBLIC_KEY = publicKey;
    expect(loadAnchorAccountPublicKey()).toBe(publicKey);
  });
});

describe("loadAnchorCosignerKeypairs", () => {
  it("throws when the env var is missing", () => {
    delete process.env.STELLAR_ANCHOR_COSIGNER_SECRETS;
    expect(() => loadAnchorCosignerKeypairs()).toThrow(/STELLAR_ANCHOR_COSIGNER_SECRETS/);
  });

  it("parses a comma-separated list of secrets into keypairs", () => {
    const a = Keypair.random();
    const b = Keypair.random();
    process.env.STELLAR_ANCHOR_COSIGNER_SECRETS = `${a.secret()},${b.secret()}`;

    const keypairs = loadAnchorCosignerKeypairs();

    expect(keypairs.map((k) => k.publicKey())).toEqual([a.publicKey(), b.publicKey()]);
  });

  it("tolerates surrounding whitespace and a trailing comma", () => {
    const a = Keypair.random();
    process.env.STELLAR_ANCHOR_COSIGNER_SECRETS = ` ${a.secret()} , `;

    expect(loadAnchorCosignerKeypairs().map((k) => k.publicKey())).toEqual([a.publicKey()]);
  });
});

describe("loadAnchorRequiredWeight", () => {
  it("defaults to requiring every locally-held cosigner when unset", () => {
    delete process.env.STELLAR_ANCHOR_REQUIRED_WEIGHT;
    expect(loadAnchorRequiredWeight(3)).toBe(3);
  });

  it("uses the configured threshold when set (e.g. a 2-of-3 quorum)", () => {
    process.env.STELLAR_ANCHOR_REQUIRED_WEIGHT = "2";
    expect(loadAnchorRequiredWeight(3)).toBe(2);
  });
});

describe("loadAnchorMultisigSetup", () => {
  it("assembles the account, cosigners, and required weight from env config", () => {
    const account = Keypair.random();
    const cosignerA = Keypair.random();
    const cosignerB = Keypair.random();
    process.env.STELLAR_ANCHOR_ACCOUNT_PUBLIC_KEY = account.publicKey();
    process.env.STELLAR_ANCHOR_COSIGNER_SECRETS = `${cosignerA.secret()},${cosignerB.secret()}`;
    process.env.STELLAR_ANCHOR_REQUIRED_WEIGHT = "2";

    const setup = loadAnchorMultisigSetup();

    expect(setup.anchorAccountPublicKey).toBe(account.publicKey());
    expect(setup.cosigners.map((c) => c.publicKey)).toEqual([cosignerA.publicKey(), cosignerB.publicKey()]);
    expect(setup.cosigners.every((c) => c.weight === 1)).toBe(true);
    expect(setup.requiredWeight).toBe(2);
  });
});

describe("loadExportSigningKeypair", () => {
  it("throws when the env var is missing", () => {
    delete process.env.STELLAR_EXPORT_SIGNING_SECRET;
    expect(() => loadExportSigningKeypair()).toThrow(/STELLAR_EXPORT_SIGNING_SECRET/);
  });

  it("returns a keypair distinct from the anchor cosigners' env var", () => {
    const exportKeypair = Keypair.random();
    process.env.STELLAR_EXPORT_SIGNING_SECRET = exportKeypair.secret();
    expect(loadExportSigningKeypair().publicKey()).toBe(exportKeypair.publicKey());
  });
});

describe("loadSigningKeyRegistry", () => {
  it("parses an explicitly configured registry", () => {
    const registry = [
      { publicKey: "GABC", role: "export-signing" as const, validFrom: "2026-01-01T00:00:00.000Z" },
    ];
    process.env.STELLAR_SIGNING_KEY_REGISTRY_JSON = JSON.stringify(registry);

    expect(loadSigningKeyRegistry()).toEqual(registry);
  });

  it("falls back to treating the current export-signing key as always-authorized when unset", () => {
    delete process.env.STELLAR_SIGNING_KEY_REGISTRY_JSON;
    const exportKeypair = Keypair.random();
    process.env.STELLAR_EXPORT_SIGNING_SECRET = exportKeypair.secret();

    const registry = loadSigningKeyRegistry();

    expect(registry).toEqual([
      { publicKey: exportKeypair.publicKey(), role: "export-signing", validFrom: "1970-01-01T00:00:00.000Z" },
    ]);
  });
});
