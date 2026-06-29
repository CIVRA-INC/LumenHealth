import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type DemographicsContractData = {
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  nationality?: string;
};

export type ContractOperation = {
  type: "store" | "verify" | "remove";
  patientId: string;
};

function encodeData(data: DemographicsContractData): string {
  return `${data.dateOfBirth}|${data.gender}|${data.bloodGroup || ""}|${data.nationality || ""}`;
}

export function hashDemographics(data: DemographicsContractData): string {
  const bytes = new TextEncoder().encode(encodeData(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildStoreOp(source: Keypair, patientId: string, data: DemographicsContractData) {
  const h = hashDemographics(data);
  return Operation.manageData({
    source: source.publicKey(),
    name: `demo_contract_${patientId.slice(0, 8)}`,
    value: h,
  });
}

export function buildRemoveOp(source: Keypair, patientId: string) {
  return Operation.manageData({
    source: source.publicKey(),
    name: `demo_contract_${patientId.slice(0, 8)}`,
    value: null,
  });
}

export function buildContractTx(
  source: Keypair,
  ops: ReturnType<typeof Operation.manageData>[],
  network: string = Networks.TESTNET,
) {
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: network })
    .addOperation(...ops)
    .addMemo(Memo.text("demographics-contract"))
    .setTimeout(30)
    .build();
}

export function verifyContractData(expected: DemographicsContractData, onChainHash: string): boolean {
  return hashDemographics(expected) === onChainHash;
}

export function parseContractValue(value: string): DemographicsContractData {
  const [dateOfBirth, gender, bloodGroup, nationality] = value.split("|");
  return { dateOfBirth, gender, bloodGroup: bloodGroup || undefined, nationality: nationality || undefined };
}
