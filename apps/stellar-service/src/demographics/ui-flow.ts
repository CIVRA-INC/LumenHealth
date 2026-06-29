import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type UiFlowStep = "select-patient" | "enter-demographics" | "confirm-on-chain" | "complete";

export type UiFlowState = {
  step: UiFlowStep;
  patientId: string;
  transactionHash?: string;
  error?: string;
};

function getKeyName(patientId: string): string {
  return `demo_ui_${patientId.slice(0, 8)}`;
}

export function buildUiFlowStoreTx(
  source: Keypair,
  patientId: string,
  demographicsData: string,
  network: string = Networks.TESTNET,
) {
  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: network,
  })
    .addOperation(
      Operation.manageData({
        source: source.publicKey(),
        name: getKeyName(patientId),
        value: demographicsData,
      }),
    )
    .addMemo(Memo.text("demographics-ui-flow"))
    .setTimeout(30)
    .build();
}

export function transitionUiFlow(current: UiFlowStep, action: string): UiFlowStep {
  const transitions: Record<UiFlowStep, Record<string, UiFlowStep>> = {
    "select-patient": { next: "enter-demographics", back: "select-patient" },
    "enter-demographics": { next: "confirm-on-chain", back: "select-patient" },
    "confirm-on-chain": { next: "complete", back: "enter-demographics", confirm: "complete" },
    complete: { reset: "select-patient" },
  };
  return transitions[current]?.[action] || current;
}

export function createUiFlowState(patientId: string): UiFlowState {
  return { step: "select-patient", patientId };
}

export async function confirmOnChain(
  source: Keypair,
  patientId: string,
  data: string,
): Promise<{ hash: string; txXdr: string }> {
  const tx = buildUiFlowStoreTx(source, patientId, data);
  tx.sign(source);
  return {
    hash: tx.hash().toString("hex"),
    txXdr: tx.toXDR(),
  };
}

export const fixtures = {
  alice: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 1)),
  patientId: "pat_ui_flow_01",
  demographicsData: "1990-04-12|female|O+|Nigerian",
};
