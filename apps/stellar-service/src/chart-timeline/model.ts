import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type ChartDataModel = {
  date: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  weight: number;
  height: number;
};

export function serializeModel(data: ChartDataModel): string {
  return `${data.date}|${data.systolic}|${data.diastolic}|${data.heartRate}|${data.weight}|${data.height}`;
}

export function hashModel(data: ChartDataModel): string {
  const bytes = new TextEncoder().encode(serializeModel(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildModelTx(
  source: Keypair,
  patientId: string,
  data: ChartDataModel,
  network: string = Networks.TESTNET,
) {
  const h = hashModel(data);
  const key = `chart_model_${patientId.slice(0, 8)}`;
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: network })
    .addOperation(Operation.manageData({ source: source.publicKey(), name: key, value: h }))
    .addMemo(Memo.text("chart-model"))
    .setTimeout(30)
    .build();
}

export function verifyModel(expected: ChartDataModel, storedHash: string): boolean {
  return hashModel(expected) === storedHash;
}

export function parseModelValue(value: string): ChartDataModel {
  const [date, systolic, diastolic, heartRate, weight, height] = value.split("|");
  return { date, systolic: Number(systolic), diastolic: Number(diastolic), heartRate: Number(heartRate), weight: Number(weight), height: Number(height) };
}

export const fixtures = {
  source: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7)),
  patientId: "pat_model_st_01",
  data: { date: "2026-07-05", systolic: 120, diastolic: 80, heartRate: 72, weight: 70, height: 175 } satisfies ChartDataModel,
};
