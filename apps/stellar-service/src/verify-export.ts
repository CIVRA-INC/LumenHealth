/**
 * Standalone compliance-export verifier.
 *
 * Takes ONLY an exported bundle file (see `AuditExportBundle` in
 * `@lumen/types`) — no LumenHealth API access, no auth, no database. It
 * recomputes each entry's hash, walks its Merkle proof, and cross-checks
 * the result against public Stellar testnet state (the `manageData`
 * operation an anchoring transaction actually wrote on-chain). It also
 * verifies the manifest's ed25519 signature against the stated signing key.
 *
 * Usage (from apps/stellar-service):
 *   npm run verify-export -- path/to/export.json
 *
 * Exit code is 0 only if the signature, the entries digest, and every
 * entry's status are all clean; otherwise 1.
 */
import { readFileSync } from "node:fs";
import { Horizon } from "@stellar/stellar-sdk";
import {
  canonicalize,
  hashAuditEntry,
  sha256Hash,
  verifyMerkleProof,
  type AuditEntry,
  type AuditExportBundle,
  type AuditExportVerifyEntryResult,
  type AuditExportVerifyReport,
} from "@lumen/types";
import { MERKLE_ROOT_DATA_NAME } from "./anchoring.js";
import { verifyPayloadSignature } from "./signing.js";

export type GetOnChainMerkleRoot = (txHash: string) => Promise<string | null>;

/** @deprecated use `AuditExportVerifyEntryResult` from `@lumen/types` */
export type ExportEntryResult = AuditExportVerifyEntryResult;

/** @deprecated use `AuditExportVerifyReport` from `@lumen/types` */
export type ExportVerificationReport = AuditExportVerifyReport;

function recomputeEntryHash(entry: AuditEntry): string {
  const { sha256Hash: _sha256Hash, stellarTxHash: _tx, merkleRoot: _root, anchoredAt: _at, merkleProof: _proof, ...hashable } = entry;
  return hashAuditEntry(hashable);
}

function recomputeEntriesDigest(entries: AuditEntry[]): string {
  const sorted = entries
    .map((entry) => ({ auditId: entry.auditId, sha256Hash: entry.sha256Hash }))
    .sort((a, b) => a.auditId.localeCompare(b.auditId));
  return sha256Hash(sorted);
}

/**
 * Pure verification core, independent of how the on-chain root is fetched —
 * `getOnChainMerkleRoot` is injected so this can be unit-tested without a
 * live Horizon connection, and reused by the real CLI against testnet.
 */
export async function verifyExportBundle(
  bundle: AuditExportBundle,
  getOnChainMerkleRoot: GetOnChainMerkleRoot,
): Promise<ExportVerificationReport> {
  const signatureValid = verifyPayloadSignature(
    bundle.signingPublicKey,
    canonicalize(bundle.manifest),
    bundle.signature,
  );

  const entriesDigestValid = recomputeEntriesDigest(bundle.entries) === bundle.manifest.entriesDigest;

  const rootCache = new Map<string, string | null>();
  const results: ExportEntryResult[] = [];

  for (const entry of bundle.entries) {
    const recomputedHash = recomputeEntryHash(entry);

    if (recomputedHash !== entry.sha256Hash) {
      results.push({
        auditId: entry.auditId,
        action: entry.action,
        status: "tampered",
        reason: "stored content no longer matches its recorded hash",
      });
      continue;
    }

    if (!entry.stellarTxHash || !entry.merkleRoot || !entry.merkleProof) {
      results.push({ auditId: entry.auditId, action: entry.action, status: "unanchored" });
      continue;
    }

    let chainRoot = rootCache.get(entry.stellarTxHash);
    if (chainRoot === undefined) {
      try {
        chainRoot = await getOnChainMerkleRoot(entry.stellarTxHash);
      } catch {
        chainRoot = null;
      }
      rootCache.set(entry.stellarTxHash, chainRoot);
    }

    if (chainRoot === null || chainRoot !== entry.merkleRoot) {
      results.push({
        auditId: entry.auditId,
        action: entry.action,
        status: "tampered",
        reason: "on-chain root does not match the stored merkle root",
      });
      continue;
    }

    if (!verifyMerkleProof(recomputedHash, entry.merkleProof, chainRoot)) {
      results.push({
        auditId: entry.auditId,
        action: entry.action,
        status: "tampered",
        reason: "merkle proof does not resolve to the on-chain root",
      });
      continue;
    }

    results.push({ auditId: entry.auditId, action: entry.action, status: "verified" });
  }

  const verifiedCount = results.filter((r) => r.status === "verified").length;
  const unanchoredCount = results.filter((r) => r.status === "unanchored").length;
  const tamperedCount = results.filter((r) => r.status === "tampered").length;

  return {
    clinicId: bundle.manifest.clinicId,
    signatureValid,
    entriesDigestValid,
    results,
    verifiedCount,
    unanchoredCount,
    tamperedCount,
    ok: signatureValid && entriesDigestValid && tamperedCount === 0,
  };
}

async function runCli() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: verify-export <bundle.json>");
    process.exitCode = 1;
    return;
  }

  const bundle = JSON.parse(readFileSync(filePath, "utf8")) as AuditExportBundle;
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");

  const getOnChainMerkleRoot: GetOnChainMerkleRoot = async (txHash) => {
    const page = await server.operations().forTransaction(txHash).call();
    for (const operation of page.records) {
      if (operation.type === "manage_data" && operation.name === MERKLE_ROOT_DATA_NAME) {
        return operation.value ? operation.value.toString("utf8") : null;
      }
    }
    return null;
  };

  const report = await verifyExportBundle(bundle, getOnChainMerkleRoot);

  console.log(`Clinic: ${report.clinicId}`);
  console.log(`Manifest signature: ${report.signatureValid ? "VALID" : "INVALID"}`);
  console.log(`Entries digest: ${report.entriesDigestValid ? "MATCH" : "MISMATCH"}`);
  console.log("");

  for (const result of report.results) {
    const label = result.status === "verified" ? "PASS" : result.status === "unanchored" ? "SKIP" : "FAIL";
    const detail = result.reason ? ` — ${result.reason}` : "";
    console.log(`[${label}] ${result.auditId} (${result.action}): ${result.status}${detail}`);
  }

  console.log("");
  console.log(
    `${report.verifiedCount} verified, ${report.unanchoredCount} unanchored, ${report.tamperedCount} tampered, ${report.results.length} total`,
  );

  process.exitCode = report.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
