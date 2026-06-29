import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type ChartUiData = {
  patientId: string;
  date: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  weight: number;
};

function encode(data: ChartUiData): string {
  return `${data.patientId}|${data.date}|${data.systolic}|${data.diastolic}|${data.heartRate}|${data.weight}`;
}

export function hashChartUi(data: ChartUiData): string {
  const bytes = new TextEncoder().encode(encode(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildUiTx(
  source: Keypair,
  data: ChartUiData,
  network: string = Networks.TESTNET,
) {
  const h = hashChartUi(data);
  const key = `chart_ui_${data.patientId.slice(0, 8)}`;
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: network })
    .addOperation(Operation.manageData({ source: source.publicKey(), name: key, value: h }))
    .addMemo(Memo.text("chart-ui-flow"))
    .setTimeout(30)
    .build();
}

export function verifyChartUi(expected: ChartUiData, storedHash: string): boolean {
  return hashChartUi(expected) === storedHash;
}

export function getUiStateKey(patientId: string): string {
  return `chart_ui_state_${patientId.slice(0, 8)}`;
}

export const fixtures = {
  source: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 6)),
  data: { patientId: "pat_ui_st_01", date: "2026-06-22", systolic: 122, diastolic: 78, heartRate: 70, weight: 75 } satisfies ChartUiData,
};
