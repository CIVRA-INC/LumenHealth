import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type UiFlowStep = "select-patient" | "select-document" | "confirm-on-chain" | "complete";

export type UiFlowState = {
  step: UiFlowStep;
  patientId: string;
  documentId: string;
  transactionHash?: string;
  error?: string;
};

function getKeyName(documentId: string): string {
  return `doc_ui_${documentId.slice(0, 8)}`;
}

export function buildDocUiFlowStoreTx(
  source: Keypair,
  documentId: string,
  documentData: string,
  network: string = Networks.TESTNET,
) {
  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: network,
  })
    .addOperation(
      Operation.manageData({
        source: source.publicKey(),
        name: getKeyName(documentId),
        value: documentData,
      }),
    )
    .addMemo(Memo.text("documents-ui-flow"))
    .setTimeout(30)
    .build();
}

export function transitionDocUiFlow(current: UiFlowStep, action: string): UiFlowStep {
  const transitions: Record<UiFlowStep, Record<string, UiFlowStep>> = {
    "select-patient": { next: "select-document", back: "select-patient" },
    "select-document": { next: "confirm-on-chain", back: "select-patient" },
    "confirm-on-chain": { next: "complete", back: "select-document", confirm: "complete" },
    complete: { reset: "select-patient" },
  };
  return transitions[current]?.[action] || current;
}

export function createDocUiFlowState(patientId: string): UiFlowState {
  return { step: "select-patient", patientId, documentId: "" };
}

export async function confirmDocOnChain(
  source: Keypair,
  documentId: string,
  data: string,
): Promise<{ hash: string; txXdr: string }> {
  const tx = buildDocUiFlowStoreTx(source, documentId, data);
  tx.sign(source);
  return {
    hash: tx.hash().toString("hex"),
    txXdr: tx.toXDR(),
  };
}

export const fixtures = {
  alice: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 1)),
  patientId: "pat_doc_ui_01",
  documentId: "doc_ui_01",
  documentData: "doc_ui_01|pat_doc_ui_01|lab-result.pdf|lab-report|abc123hash",
};
