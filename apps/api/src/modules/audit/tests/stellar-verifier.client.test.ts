import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnchoringHealthReport, AuditExportVerifyReport, BatchAnchorResult } from "@lumen/types";
import { AuditRepository } from "../repositories/audit.repository.js";
import { AuditService } from "../services/audit.service.js";
import { InvalidStellarResponseError, StellarVerifierClient } from "../services/stellar-verifier.client.js";
import {
  parseAnchoringHealth,
  parseBatchAnchorResult,
  parseExportVerifyReport,
  parseMerkleRootResponse,
  parseSignedPayload,
} from "../services/stellar-response.validators.js";

const ROOT = "ab".repeat(32);

const goodBatch: BatchAnchorResult = {
  merkleRoot: ROOT,
  stellarTxHash: "tx-1",
  anchoredAt: "2026-03-31T10:00:00.000Z",
  mode: "immediate",
  entries: [{ auditId: "a-1", merkleProof: [{ hash: ROOT, position: "left" }] }],
};
const goodReport: AuditExportVerifyReport = {
  clinicId: "c-1",
  signatureValid: true,
  entriesDigestValid: true,
  results: [{ auditId: "a-1", action: "staff.invited", status: "verified" }],
  verifiedCount: 1,
  unanchoredCount: 0,
  tamperedCount: 0,
  ok: true,
};
const goodHealth: AnchoringHealthReport = {
  lastSuccessfulTickAt: "2026-03-31T10:00:00.000Z",
  lastAnchorAt: null,
  consecutiveFailureCount: 0,
  unanchoredCount: 2,
  oldestUnanchoredAgeMs: null,
  pendingPersistCount: 0,
  checkedAt: "2026-03-31T10:00:01.000Z",
};

describe("response validators", () => {
  it("accept well-formed payloads", () => {
    expect(parseMerkleRootResponse({ merkleRoot: ROOT })).toBe(ROOT);
    expect(parseSignedPayload({ signature: "c2ln", publicKey: "GABC" })).toEqual({ signature: "c2ln", publicKey: "GABC" });
    expect(parseExportVerifyReport(goodReport)).toBe(goodReport);
    expect(parseAnchoringHealth(goodHealth)).toBe(goodHealth);
    expect(parseBatchAnchorResult(goodBatch)).toBe(goodBatch);
  });

  it.each([
    ["missing merkleRoot", () => parseMerkleRootResponse({})],
    ["non-hex merkleRoot", () => parseMerkleRootResponse({ merkleRoot: "not hex!" })],
    ["empty merkleRoot", () => parseMerkleRootResponse({ merkleRoot: "" })],
    ["signature missing", () => parseSignedPayload({ publicKey: "G" })],
    ["entries not an array", () => parseExportVerifyReport({ ...goodReport, results: "nope" })],
    ["unknown result status", () => parseExportVerifyReport({ ...goodReport, results: [{ auditId: "a", action: "x", status: "maybe" }] })],
    ["negative count", () => parseAnchoringHealth({ ...goodHealth, unanchoredCount: -1 })],
    ["null body", () => parseBatchAnchorResult(null)],
    ["batch entries not an array", () => parseBatchAnchorResult({ ...goodBatch, entries: {} })],
    ["bad proof step", () => parseBatchAnchorResult({ ...goodBatch, entries: [{ auditId: "a", merkleProof: [{ hash: "zz", position: "up" }] }] })],
    ["merkleRoot missing on batch", () => parseBatchAnchorResult({ ...goodBatch, merkleRoot: undefined })],
  ])("reject %s", (_label, run) => {
    expect(run).toThrow(InvalidStellarResponseError);
  });
});

const config = {
  stellarServiceUrl: "http://stellar.test",
  internalServiceSecrets: [{ keyId: "k1", secret: "s3cret-s3cret-s3cret" }],
};

function respond(body: unknown, init: { status?: number; json?: boolean } = {}): Response {
  const text = init.json === false ? String(body) : JSON.stringify(body);
  return new Response(text, { status: init.status ?? 200 });
}

function clientFor(response: Response): StellarVerifierClient {
  vi.stubGlobal("fetch", vi.fn(async () => response));
  return new StellarVerifierClient(config as never);
}

afterEach(() => vi.unstubAllGlobals());

describe("StellarVerifierClient runtime validation", () => {
  const bundle = {} as never;

  it("returns validated payloads for all five methods", async () => {
    await expect(clientFor(respond({ merkleRoot: ROOT })).fetchAnchoredMerkleRoot("tx")).resolves.toBe(ROOT);
    await expect(clientFor(respond({ signature: "c2ln", publicKey: "GABC" })).signExportManifest("{}")).resolves.toEqual({
      signature: "c2ln",
      publicKey: "GABC",
    });
    await expect(clientFor(respond(goodReport)).verifyExportBundleRemote(bundle)).resolves.toEqual(goodReport);
    await expect(clientFor(respond(goodHealth)).fetchAnchoringHealth()).resolves.toEqual(goodHealth);
    await expect(clientFor(respond(goodBatch)).anchorEntriesImmediately([])).resolves.toEqual(goodBatch);
  });

  it("rejects malformed payloads for all five methods", async () => {
    await expect(clientFor(respond({})).fetchAnchoredMerkleRoot("tx")).rejects.toBeInstanceOf(InvalidStellarResponseError);
    await expect(clientFor(respond({ signature: "x" })).signExportManifest("{}")).rejects.toBeInstanceOf(InvalidStellarResponseError);
    await expect(clientFor(respond({ ...goodReport, results: null })).verifyExportBundleRemote(bundle)).rejects.toBeInstanceOf(
      InvalidStellarResponseError,
    );
    await expect(clientFor(respond({ nope: true })).fetchAnchoringHealth()).rejects.toBeInstanceOf(InvalidStellarResponseError);
    await expect(clientFor(respond({ ...goodBatch, merkleRoot: undefined })).anchorEntriesImmediately([])).rejects.toBeInstanceOf(
      InvalidStellarResponseError,
    );
  });

  it("turns a non-JSON 200 body into a typed error without echoing it", async () => {
    const body = "<html>502 from proxy: secret-internal-hostname</html>";
    const error = await clientFor(respond(body, { json: false })).fetchAnchoringHealth().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(InvalidStellarResponseError);
    expect((error as Error).message).not.toContain("secret-internal-hostname");
    expect((error as Error).message).not.toContain("Unexpected token");
  });
});

describe("AuditService.anchorImmediately", () => {
  it("never mutates the repository when the response is invalid", async () => {
    const repository = new AuditRepository();
    const applyAnchorResult = vi.spyOn(repository, "applyAnchorResult");
    const client = clientFor(respond({ ...goodBatch, entries: "nope" }));
    const service = new AuditService(repository, client, {} as never);

    await expect(service.anchorImmediately({ auditId: "a-1", sha256Hash: "h", createdAt: "2026-03-31T10:00:00.000Z" })).rejects.toBeInstanceOf(
      InvalidStellarResponseError,
    );
    expect(applyAnchorResult).not.toHaveBeenCalled();
  });
});
