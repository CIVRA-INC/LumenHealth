import { Injectable } from '@nestjs/common';
import { signInternalRequest } from "@lumen/types";
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

  private authHeaders(method: string, url: string, body?: unknown): Record<string, string> {
    const primary = this.config.internalServiceSecrets[0];
    if (!primary) {
      throw new Error("[audit] no internal service secret configured");
    }
    const { pathname, search } = new URL(url);
    return {
      "Content-Type": "application/json",
      // #1345: short-lived HMAC signature over method + path + body hash +
      // timestamp + nonce, replacing the static service token.
      ...signInternalRequest({ method, path: `${pathname}${search}`, body }, primary),
    };
  }

  async fetchAnchoredMerkleRoot(txHash: string): Promise<string | null> {
    const url = `${this.config.stellarServiceUrl}/internal/tx/${encodeURIComponent(txHash)}/merkle-root`;
    const res = await fetch(url, {
      headers: this.authHeaders("GET", url),
    });

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
    const url = `${this.config.stellarServiceUrl}/internal/sign`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.authHeaders("POST", url, { payload }),
      body: JSON.stringify({ payload }),
    });

    if (!res.ok) {
      throw new Error(`[audit] failed to sign export manifest: ${res.status}`);
    }

    return (await res.json()) as SignedPayload;
  }

  async verifyExportBundleRemote(bundle: AuditExportBundle): Promise<AuditExportVerifyReport> {
    const url = `${this.config.stellarServiceUrl}/internal/verify-export`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.authHeaders("POST", url, { bundle }),
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
    const url = `${this.config.stellarServiceUrl}/internal/anchoring/health`;
    const res = await fetch(url, {
      headers: this.authHeaders("GET", url),
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
    const url = `${this.config.stellarServiceUrl}/internal/anchor-immediate`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.authHeaders("POST", url, { entries }),
      body: JSON.stringify({ entries }),
    });

    if (!res.ok) {
      throw new Error(`[audit] failed to anchor entries immediately: ${res.status}`);
    }

    return (await res.json()) as BatchAnchorResult;
  }
}
