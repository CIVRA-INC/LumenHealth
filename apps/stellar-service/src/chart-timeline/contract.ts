import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type ChartContractData = {
  encounterDate: string;
  encounterType: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  weight: number;
};

function serialize(data: ChartContractData): string {
  return `${data.encounterDate}|${data.encounterType}|${data.systolic}|${data.diastolic}|${data.heartRate}|${data.weight}`;
}

export function hashChartData(data: ChartContractData): string {
  const bytes = new TextEncoder().encode(serialize(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildChartStoreTx(
  source: Keypair,
  patientId: string,
  data: ChartContractData,
  network: string = Networks.TESTNET,
) {
  const h = hashChartData(data);
  const key = `chart_${patientId.slice(0, 8)}`;
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: network })
    .addOperation(Operation.manageData({ source: source.publicKey(), name: key, value: h }))
    .addOperation(Operation.manageData({ source: source.publicKey(), name: `${key}_bp`, value: `${data.systolic}/${data.diastolic}` }))
    .addMemo(Memo.text("chart-contract"))
    .setTimeout(30)
    .build();
}

export function verifyChartData(expected: ChartContractData, storedHash: string): boolean {
  return hashChartData(expected) === storedHash;
}

export function parseChartValue(value: string): ChartContractData {
  const [encounterDate, encounterType, systolic, diastolic, heartRate, weight] = value.split("|");
  return {
    encounterDate,
    encounterType,
    systolic: Number(systolic),
    diastolic: Number(diastolic),
    heartRate: Number(heartRate),
    weight: Number(weight),
  };
}

export const fixtures = {
  source: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 5)),
  patientId: "pat_chart_c_01",
  data: { encounterDate: "2026-06-15", encounterType: "checkup", systolic: 118, diastolic: 76, heartRate: 68, weight: 72 } satisfies ChartContractData,
};
