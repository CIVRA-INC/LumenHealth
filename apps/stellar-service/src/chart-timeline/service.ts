import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type ChartServiceData = {
  date: string;
  encounterType: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  weight: number;
  height: number;
};

function serialize(data: ChartServiceData): string {
  return `${data.date}|${data.encounterType}|${data.systolic}|${data.diastolic}|${data.heartRate}|${data.weight}|${data.height}`;
}

export function hashServiceData(data: ChartServiceData): string {
  const bytes = new TextEncoder().encode(serialize(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildServiceTx(
  source: Keypair,
  patientId: string,
  data: ChartServiceData,
  network: string = Networks.TESTNET,
) {
  const h = hashServiceData(data);
  const key = `chart_svc_${patientId.slice(0, 8)}`;
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: network })
    .addOperation(Operation.manageData({ source: source.publicKey(), name: key, value: h }))
    .addOperation(Operation.manageData({ source: source.publicKey(), name: `${key}_type`, value: data.encounterType }))
    .addMemo(Memo.text("chart-service"))
    .setTimeout(30)
    .build();
}

export function verifyServiceData(expected: ChartServiceData, storedHash: string): boolean {
  return hashServiceData(expected) === storedHash;
}

export const fixtures = {
  source: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 8)),
  patientId: "pat_svc_st_01",
  data: { date: "2026-07-12", encounterType: "checkup", systolic: 120, diastolic: 80, heartRate: 72, weight: 70, height: 175 } satisfies ChartServiceData,
};
