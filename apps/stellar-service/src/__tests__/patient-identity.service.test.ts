import { describe, expect, it, beforeEach } from "vitest";
import { sha256Hash } from "@lumen/types";
import {
  anchorPatientIdentity,
  verifyPatientIdentity,
  getIdentityAnchorStatus,
  _resetIdentityStoreForTests,
} from "../patient-identity.service.js";

describe("PatientIdentityService", () => {
  beforeEach(() => {
    _resetIdentityStoreForTests();
  });

  describe("anchorPatientIdentity", () => {
    it("anchors an identity and returns a proof hash and tx hash", async () => {
      const result = await anchorPatientIdentity("p-1", "hash_elena_001");

      expect(result.identityHash).toBeTypeOf("string");
      expect(result.identityHash.length).toBe(64);
      expect(result.stellarTxHash).toMatch(/^tx_identity_/);
      expect(result.anchoredAt).toBeDefined();
    });

    it("anchors different patients to different hashes", async () => {
      const a = await anchorPatientIdentity("p-1", "hash_a");
      const b = await anchorPatientIdentity("p-2", "hash_b");

      expect(a.identityHash).not.toBe(b.identityHash);
      expect(a.stellarTxHash).not.toBe(b.stellarTxHash);
    });
  });

  describe("verifyPatientIdentity", () => {
    it("returns isValid false for an unanchored patient", async () => {
      const result = await verifyPatientIdentity("p-unknown", "some-proof");

      expect(result.isValid).toBe(false);
      expect(result.identityHash).toBe("some-proof");
      expect(result.recomputedHash).toBe("");
    });

    it("returns isValid true when proof matches the anchored canonical hash", async () => {
      const anchored = await anchorPatientIdentity("p-1", "hash_elena_001");
      const canonical = JSON.stringify({ patientId: "p-1", identityHash: "hash_elena_001", anchored: true });
      const expectedProof = sha256Hash(canonical);

      const result = await verifyPatientIdentity("p-1", expectedProof);

      expect(result.isValid).toBe(true);
      expect(result.identityHash).toBe("hash_elena_001");
      expect(result.recomputedHash).toBe(expectedProof);
    });

    it("returns isValid false when proof does not match", async () => {
      await anchorPatientIdentity("p-1", "hash_elena_001");

      const result = await verifyPatientIdentity("p-1", "wrong-proof-value");

      expect(result.isValid).toBe(false);
    });
  });

  describe("getIdentityAnchorStatus", () => {
    it("returns not anchored for unknown patient", async () => {
      const status = await getIdentityAnchorStatus("p-unknown");

      expect(status.patientId).toBe("p-unknown");
      expect(status.isAnchored).toBe(false);
      expect(status.identityHash).toBeUndefined();
    });

    it("returns anchored status after anchoring", async () => {
      await anchorPatientIdentity("p-1", "hash_elena_001");

      const status = await getIdentityAnchorStatus("p-1");

      expect(status.isAnchored).toBe(true);
      expect(status.identityHash).toBe("hash_elena_001");
      expect(status.stellarTxHash).toMatch(/^tx_identity_/);
      expect(status.anchoredAt).toBeDefined();
    });
  });
});
