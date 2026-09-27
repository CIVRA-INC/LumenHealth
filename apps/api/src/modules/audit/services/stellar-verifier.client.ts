import { Injectable } from '@nestjs/common';
import type {
  AnchoringHealthReport,
  AuditExportBundle,
  AuditExportVerifyReport,
  BatchAnchorResult,
} from "@lumen/types";
import { ConfigService } from "../../../shared/config/config.service.js";

export type SignedPayload = {
  signature: string;
  publicKey: string;
};

export class InvalidExportBundleError extends Error {}

export class AnchoringNotConfiguredError extends Error {
  constructor() {
    super("the running stellar-service process doesn't run the anchoring scheduler");
  }
}

export type ImmediateAnchorEntry = { auditId: string; sha256Hash: string; createdAt: string };

@Injectable()
export class StellarVerifierClient {
  constructor(private readonly config: ConfigService) {}

  private getHeaders() {
    return {
      "Content-Type": "application/json",
      "x-internal-service-token": this.config.internalServiceToken,
    };
  }

  async fetchAnchoredMerkleRoot(txHash: string): Promise<string | null> {
    const res = await fetch(
      `${this.config.stellarServiceUrl}/internal/tx/${encodeURIComponent(txHash)}/merkle-root`,
      {
        headers: { "x-internal-service-token": this.config.internalServiceToken },
      },
    );

    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`[audit] failed to fetch anchored merkle root: ${res.status}`);
    }

    const body = (await res.json()) as { merkleRoot: string };
    return body.merkleRoot;
  }

  async signExportManifest(payload: string): Promise<SignedPayload> {
    const res = await fetch(`${this.config.stellarServiceUrl}/internal/sign`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ payload }),
    });

    if (!res.ok) {
      throw new Error(`[audit] failed to sign export manifest: ${res.status}`);
    }

    return (await res.json()) as SignedPayload;
  }

  async verifyExportBundleRemote(bundle: AuditExportBundle): Promise<AuditExportVerifyReport> {
    const res = await fetch(`${this.config.stellarServiceUrl}/internal/verify-export`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ bundle }),
    });

    if (res.status === 400) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new InvalidExportBundleError(body.message ?? "malformed export bundle");
    }
    if (!res.ok) {
      throw new Error(`[audit] failed to verify export bundle: ${res.status}`);
    }

    return (await res.json()) as AuditExportVerifyReport;
  }

  async fetchAnchoringHealth(): Promise<AnchoringHealthReport> {
    const res = await fetch(`${this.config.stellarServiceUrl}/internal/anchoring/health`, {
      headers: { "x-internal-service-token": this.config.internalServiceToken },
    });

    if (res.status === 501) {
      throw new AnchoringNotConfiguredError();
    }
    if (!res.ok) {
      throw new Error(`[audit] failed to fetch anchoring health: ${res.status}`);
    }

    return (await res.json()) as AnchoringHealthReport;
  }

  async anchorEntriesImmediately(entries: ImmediateAnchorEntry[]): Promise<BatchAnchorResult> {
    const res = await fetch(`${this.config.stellarServiceUrl}/internal/anchor-immediate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ entries }),
    });

    if (!res.ok) {
      throw new Error(`[audit] failed to anchor entries immediately: ${res.status}`);
    }

    return (await res.json()) as BatchAnchorResult;
  }
}
