/**
 * Patient document hash anchoring on Stellar.
 * Stores a SHA-256 hash of each document as a Stellar transaction memo
 * for immutable audit trail purposes.
 */
import { Keypair, Networks, TransactionBuilder, Operation, Asset, BASE_FEE, Memo } from '@stellar/stellar-sdk';
import * as crypto from 'crypto';

export interface AnchorResult {
  txHash: string;
  documentHash: string;
  ledger: number;
}

/**
 * Compute SHA-256 hash of document content.
 */
export function hashDocument(content: Buffer | string): string {
  return crypto.createHash('sha256')
    .update(typeof content === 'string' ? Buffer.from(content) : content)
    .digest('hex')
    .slice(0, 28); // Stellar memo text max 28 bytes
}

/**
 * Anchor a document hash to Stellar testnet.
 * Returns the transaction hash and memo for audit logging.
 */
export async function anchorDocumentHash(
  signerSecretKey: string,
  documentContent: Buffer | string,
  horizonUrl = 'https://horizon-testnet.stellar.org',
): Promise<AnchorResult> {
  const { Horizon } = await import('@stellar/stellar-sdk');
  const server    = new Horizon.Server(horizonUrl);
  const keypair   = Keypair.fromSecret(signerSecretKey);
  const docHash   = hashDocument(documentContent);
  const account   = await server.loadAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.manageData({ name: 'doc_hash', value: docHash }))
    .addMemo(Memo.text(docHash))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.submitTransaction(tx);

  return {
    txHash:      result.hash,
    documentHash: docHash,
    ledger:      result.ledger,
  };
}
