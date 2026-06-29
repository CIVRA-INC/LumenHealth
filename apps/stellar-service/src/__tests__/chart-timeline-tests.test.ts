import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

type ChartEntryData = {
  date: string;
  encounterType: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  weight: number;
};

function serializeEntry(data: ChartEntryData): string {
  return `${data.date}|${data.encounterType}|${data.systolic}|${data.diastolic}|${data.heartRate}|${data.weight}`;
}

function hashEntry(data: ChartEntryData): string {
  const bytes = new TextEncoder().encode(serializeEntry(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildEntryTx(source: Keypair, patientId: string, data: ChartEntryData) {
  const h = hashEntry(data);
  const key = `chart_tf_${patientId.slice(0, 8)}`;
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.manageData({ source: source.publicKey(), name: key, value: h }))
    .addMemo(Memo.text("chart-tf"))
    .setTimeout(30)
    .build();
}

function verifyEntry(expected: ChartEntryData, storedHash: string): boolean {
  return hashEntry(expected) === storedHash;
}

function parseEntryValue(value: string): ChartEntryData {
  const [date, encounterType, systolic, diastolic, heartRate, weight] = value.split("|");
  return { date, encounterType, systolic: Number(systolic), diastolic: Number(diastolic), heartRate: Number(heartRate), weight: Number(weight) };
}

const fixtures = {
  source: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 9)),
  patientId: "pat_st_tf_01",
  data: { date: "2026-07-18", encounterType: "follow-up", systolic: 122, diastolic: 80, heartRate: 68, weight: 71 } satisfies ChartEntryData,
  modified: { date: "2026-07-18", encounterType: "checkup", systolic: 122, diastolic: 80, heartRate: 68, weight: 71 } satisfies ChartEntryData,
};

describe("Chart Timeline Stellar — Tests & Fixtures", () => {
  it("hashes deterministically", () => {
    expect(hashEntry(fixtures.data)).toBe(hashEntry(fixtures.data));
  });

  it("produces different hashes for different data", () => {
    expect(hashEntry(fixtures.data)).not.toBe(hashEntry(fixtures.modified));
  });

  it("builds a valid transaction", () => {
    const tx = buildEntryTx(fixtures.source, fixtures.patientId, fixtures.data);
    expect(tx.operations).toHaveLength(1);
  });

  it("verifies matching data", () => {
    const h = hashEntry(fixtures.data);
    expect(verifyEntry(fixtures.data, h)).toBe(true);
  });

  it("rejects mismatched data", () => {
    const h = hashEntry(fixtures.data);
    expect(verifyEntry(fixtures.modified, h)).toBe(false);
  });

  it("parses serialized value", () => {
    const v = serializeEntry(fixtures.data);
    const p = parseEntryValue(v);
    expect(p.systolic).toBe(122);
    expect(p.encounterType).toBe("follow-up");
  });
});
