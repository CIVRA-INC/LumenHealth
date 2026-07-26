import { Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import type { Keypair, Horizon } from "@stellar/stellar-sdk";
import type { StellarClient } from "./client.js";
import { sha256Hash } from "./hashing.js";
import { signPayload, verifyPayloadSignature } from "./signing.js";
import type { SignedPayload } from "./signing.js";

export const CONSENT_DATA_PREFIX = "consent_anchor_";

export type ConsentAnchorResult = {
  patientId: string;
  consentHash: string;
  stellarTxHash: string;
  anchoredAt: string;
  proof: SignedPayload;
};

export type ConsentVerificationResult = {
  patientId: string;
  isValid: boolean;
  reason?: string;
  verifiedAt: string;
};

export type FetchConsentHash = (patientId: string) => Promise<string | null>;

export class ConsentAnchoringService {
  constructor(
    private readonly client: StellarClient,
    private readonly keypair: Keypair,
    private readonly fetchConsentHash: FetchConsentHash,
  ) {}

  async anchorConsent(patientId: string, consentHash: string): Promise<ConsentAnchorResult> {
    const dataName = `${CONSENT_DATA_PREFIX}${patientId}`;
    const account = await this.client.loadAccount(this.keypair.publicKey());

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.client.network.networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: dataName,
          value: consentHash,
        }),
      )
      .setTimeout(30)
      .build();

    transaction.sign(this.keypair);

    const response = await this.client.raw().submitTransaction(transaction);
    const anchoredAt = new Date().toISOString();

    const proof = signPayload(this.keypair, `${patientId}:${consentHash}:${anchoredAt}`);

    return {
      patientId,
      consentHash,
      stellarTxHash: response.hash,
      anchoredAt,
      proof,
    };
  }

  async verifyConsent(patientId: string, proof: SignedPayload): Promise<ConsentVerificationResult> {
    const verifiedAt = new Date().toISOString();

    const storedHash = await this.fetchConsentHash(patientId);
    if (!storedHash) {
      return {
        patientId,
        isValid: false,
        reason: "No consent record found for patient.",
        verifiedAt,
      };
    }

    if (proof.publicKey !== this.keypair.publicKey()) {
      return {
        patientId,
        isValid: false,
        reason: "Consent proof was not signed by the expected anchor key.",
        verifiedAt,
      };
    }

    const validSignature = verifyPayloadSignature(
      proof.publicKey,
      `${patientId}:${storedHash}`,
      proof.signature,
    );

    if (!validSignature) {
      return {
        patientId,
        isValid: false,
        reason: "Consent proof signature verification failed.",
        verifiedAt,
      };
    }

    return {
      patientId,
      isValid: true,
      verifiedAt,
    };
  }
}
