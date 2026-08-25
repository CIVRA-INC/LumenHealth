import { describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  buildMerkleTree,
  canonicalize,
  getMerkleProof,
  hashAuditEntry,
  sha256Hash,
  type AuditEntry,
  type AuditExportBundle,
  type HashableAuditEntry,
  type SigningKeyRecord,
} from "@lumen/types";
import { signPayload } from "../signing.js";
import { verifyExportBundle } from "../verify-export.js";

function makeHashableEntry(auditId: string): HashableAuditEntry {
  return {
    auditId,
    clinicId: "c-1",
    action: "staff.role_changed",
    actorId: "actor-1",
    actorRole: "owner",
    targetId: "staff-1",
    targetType: "staff",
    before: { role: "clinician" },
    after: { role: "admin" },
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function buildGenuineBundle() {
  const signingKeypair = Keypair.random();

  const genuineHashable = makeHashableEntry("a-genuine");
  const genuineHash = hashAuditEntry(genuineHashable);

  const tamperedHashable = makeHashableEntry("a-tampered");
  const tamperedHash = hashAuditEntry(tamperedHashable);

  const unanchoredHashable = makeHashableEntry("a-unanchored");
  const unanchoredEntry: AuditEntry = { ...unanchoredHashable, sha256Hash: hashAuditEntry(unanchoredHashable) };

  const tree = buildMerkleTree([genuineHash, tamperedHash]);
  const stellarTxHash = "tx-batch-1";
  const anchoredAt = "2026-01-02T00:00:00.000Z";

  const genuineEntry: AuditEntry = {
    ...genuineHashable,
    sha256Hash: genuineHash,
    stellarTxHash,
    merkleRoot: tree.root,
    anchoredAt,
    merkleProof: getMerkleProof(tree, 0),
  };

  // This entry's on-chain-eligible fields are computed honestly, but its
  // *content* gets mutated below — simulating a DB operator editing the
  // record after it was hashed, anchored, and exported.
  const tamperedEntry: AuditEntry = {
    ...tamperedHashable,
    sha256Hash: tamperedHash,
    stellarTxHash,
    merkleRoot: tree.root,
    anchoredAt,
    merkleProof: getMerkleProof(tree, 1),
    after: { role: "owner" }, // <-- mutated post-hash
  };

  const entries = [genuineEntry, tamperedEntry, unanchoredEntry];
  const entriesDigest = sha256Hash(
    entries
      .map((e) => ({ auditId: e.auditId, sha256Hash: e.sha256Hash }))
      .sort((a, b) => a.auditId.localeCompare(b.auditId)),
  );

  const manifest = {
    clinicId: "c-1",
    generatedAt: "2026-01-03T00:00:00.000Z",
    range: { from: "2026-01-01", to: "2026-01-02" },
    entryCount: entries.length,
    entriesDigest,
  };

  const { signature, publicKey } = signPayload(signingKeypair, canonicalize(manifest));

  const bundle: AuditExportBundle = {
    manifest,
    signature,
    signingPublicKey: publicKey,
    entries,
  };

  return { bundle, tree, signingKeypair };
}

describe("verifyExportBundle", () => {
  it("verifies a genuine, untampered entry as 'verified' against the true on-chain root", async () => {
    const { bundle, tree } = buildGenuineBundle();
    const getOnChainMerkleRoot = async () => tree.root;

    const report = await verifyExportBundle(bundle, getOnChainMerkleRoot);

    const genuineResult = report.results.find((r) => r.auditId === "a-genuine");
    expect(genuineResult?.status).toBe("verified");
  });

  it("flags a deliberately-mutated entry as 'tampered' via hash mismatch", async () => {
    const { bundle, tree } = buildGenuineBundle();
    const getOnChainMerkleRoot = async () => tree.root;

    const report = await verifyExportBundle(bundle, getOnChainMerkleRoot);

    const tamperedResult = report.results.find((r) => r.auditId === "a-tampered");
    expect(tamperedResult?.status).toBe("tampered");
    expect(tamperedResult?.reason).toMatch(/no longer matches/i);
    expect(report.tamperedCount).toBe(1);
    expect(report.ok).toBe(false);
  });

  it("reports 'unanchored' for an entry with no chain data, without a chain lookup", async () => {
    const { bundle, tree } = buildGenuineBundle();
    const calls: string[] = [];
    const getOnChainMerkleRoot = async (txHash: string) => {
      calls.push(txHash);
      return tree.root;
    };

    const report = await verifyExportBundle(bundle, getOnChainMerkleRoot);

    const unanchoredResult = report.results.find((r) => r.auditId === "a-unanchored");
    expect(unanchoredResult?.status).toBe("unanchored");
  });

  it("validates the manifest signature and entries digest", async () => {
    const { bundle, tree } = buildGenuineBundle();
    const report = await verifyExportBundle(bundle, async () => tree.root);

    expect(report.signatureValid).toBe(true);
    expect(report.entriesDigestValid).toBe(true);
  });

  it("flags an invalid signature (bundle signed by, or altered from, someone else)", async () => {
    const { bundle, tree } = buildGenuineBundle();
    const tamperedBundle: AuditExportBundle = { ...bundle, signingPublicKey: Keypair.random().publicKey() };

    const report = await verifyExportBundle(tamperedBundle, async () => tree.root);

    expect(report.signatureValid).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("flags a mismatched entries digest (entries added/removed after signing)", async () => {
    const { bundle, tree } = buildGenuineBundle();
    const withExtraEntry: AuditExportBundle = {
      ...bundle,
      entries: [...bundle.entries, { ...bundle.entries[0]!, auditId: "a-injected" }],
    };

    const report = await verifyExportBundle(withExtraEntry, async () => tree.root);

    expect(report.entriesDigestValid).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("treats a chain-root mismatch as tampered even when the stored hash is untouched", async () => {
    const { bundle } = buildGenuineBundle();
    const report = await verifyExportBundle(bundle, async () => "a-totally-different-root");

    const genuineResult = report.results.find((r) => r.auditId === "a-genuine");
    expect(genuineResult?.status).toBe("tampered");
    expect(genuineResult?.reason).toMatch(/on-chain root/i);
  });

  it("is overall 'ok' only when signature, digest, and every entry are clean", async () => {
    const { bundle, tree, signingKeypair: _unused } = buildGenuineBundle();
    // Strip the tampered/unanchored entries so only the genuine one remains.
    const cleanEntries = bundle.entries.filter((e) => e.auditId === "a-genuine");
    const entriesDigest = sha256Hash(
      cleanEntries
        .map((e) => ({ auditId: e.auditId, sha256Hash: e.sha256Hash }))
        .sort((a, b) => a.auditId.localeCompare(b.auditId)),
    );
    const manifest = { ...bundle.manifest, entryCount: cleanEntries.length, entriesDigest };
    const cleanBundle: AuditExportBundle = { ...bundle, manifest, entries: cleanEntries };
    // Re-sign since the manifest changed.
    const keypair = Keypair.random();
    const { signature, publicKey } = signPayload(keypair, canonicalize(manifest));
    cleanBundle.signature = signature;
    cleanBundle.signingPublicKey = publicKey;

    const report = await verifyExportBundle(cleanBundle, async () => tree.root);
    expect(report.ok).toBe(true);
  });
});

describe("verifyExportBundle — signing key authorization registry", () => {
  it("leaves signingKeyAuthorized undefined and doesn't affect ok when no registry is supplied", async () => {
    const { bundle, tree } = buildGenuineBundle();
    const report = await verifyExportBundle(bundle, async () => tree.root);

    expect(report.signingKeyAuthorized).toBeUndefined();
  });

  it("reports signingKeyAuthorized: true for a key the registry authorizes at the manifest's generatedAt", async () => {
    const { bundle, tree, signingKeypair } = buildGenuineBundle();
    const registry: SigningKeyRecord[] = [
      {
        publicKey: signingKeypair.publicKey(),
        role: "export-signing",
        validFrom: "2020-01-01T00:00:00.000Z",
      },
    ];

    const report = await verifyExportBundle(bundle, async () => tree.root, registry);

    // buildGenuineBundle()'s fixture includes a deliberately-tampered entry
    // (see the top-level describe block), so `ok` is false regardless —
    // this test only cares about the signing-key check itself.
    expect(report.signingKeyAuthorized).toBe(true);
  });

  it("reports signingKeyAuthorized: false and fails 'ok' for a key not in the registry, even though the signature itself is cryptographically valid", async () => {
    const { bundle, tree } = buildGenuineBundle();
    const registry: SigningKeyRecord[] = [
      { publicKey: Keypair.random().publicKey(), role: "export-signing", validFrom: "2020-01-01T00:00:00.000Z" },
    ];

    const report = await verifyExportBundle(bundle, async () => tree.root, registry);

    expect(report.signatureValid).toBe(true);
    expect(report.signingKeyAuthorized).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("reports signingKeyAuthorized: false for a key that was rotated out before this manifest's generatedAt", async () => {
    const { bundle, tree, signingKeypair } = buildGenuineBundle();
    // bundle.manifest.generatedAt is "2026-01-03T00:00:00.000Z" — this record expired before then.
    const registry: SigningKeyRecord[] = [
      {
        publicKey: signingKeypair.publicKey(),
        role: "export-signing",
        validFrom: "2020-01-01T00:00:00.000Z",
        validTo: "2025-01-01T00:00:00.000Z",
      },
    ];

    const report = await verifyExportBundle(bundle, async () => tree.root, registry);

    expect(report.signingKeyAuthorized).toBe(false);
    expect(report.ok).toBe(false);
  });
});
