import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
  xdr,
} from "@stellar/stellar-sdk";

export type DemographicsData = {
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  nationality?: string;
};

export type StellarDemographicsResult = {
  hash: string;
  transactionXdr: string;
};

function serializeDemographics(data: DemographicsData): string {
  return [data.dateOfBirth, data.gender, data.bloodGroup || "", data.nationality || ""].join("|");
}

export function computeDemographicsHash(data: DemographicsData): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(serializeDemographics(data));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildStoreDemographicsTx(
  source: Keypair,
  patientId: string,
  data: DemographicsData,
  network: string = Networks.TESTNET,
) {
  const hash = computeDemographicsHash(data);
  const keyName = `demo_${patientId.slice(0, 8)}`;

  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: network,
  })
    .addOperation(
      Operation.manageData({
        source: source.publicKey(),
        name: keyName,
        value: hash,
      }),
    )
    .addOperation(
      Operation.manageData({
        source: source.publicKey(),
        name: `${keyName}_meta`,
        value: `${data.dateOfBirth}|${data.gender}`,
      }),
    )
    .addMemo(Memo.text("demographics"))
    .setTimeout(30)
    .build();
}

export async function submitDemographics(
  source: Keypair,
  patientId: string,
  data: DemographicsData,
  serverUrl: string = "https://horizon-testnet.stellar.org",
): Promise<StellarDemographicsResult> {
  const tx = buildStoreDemographicsTx(source, patientId, data);
  tx.sign(source);
  return {
    hash: computeDemographicsHash(data),
    transactionXdr: tx.toXDR(),
  };
}

export function decodeDemographicsValue(value: string): string[] {
  return value.split("|");
}

export function verifyDemographicsOnChain(
  expected: DemographicsData,
  storedHash: string,
): boolean {
  const computed = computeDemographicsHash(expected);
  return computed === storedHash;
}
