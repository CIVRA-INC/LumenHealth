import { Horizon, Networks, hash, xdr } from "@stellar/stellar-sdk";
import { serverConfig } from "@lumen/config";

const networkPassphrase =
  serverConfig.stellarNetwork === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

const server = new Horizon.Server(serverConfig.stellarHorizonUrl);

export interface DemographicsRecord {
  patientId: string;
  hash: string;
  lastUpdated: string;
  txHash?: string;
}

export async function anchorDemographicsHash(patientId: string, data: string): Promise<string> {
  const dataHash = hash(Buffer.from(data)).toString("hex");

  const transaction = new TransactionBuilder(/* source account */, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(
      Operations.manageData({
        name: `demographics_${patientId}`,
        value: dataHash,
      })
    )
    .setTimeout(30)
    .build();

  const result = await server.submitTransaction(transaction);
  return result.hash;
}

export async function verifyDemographicsHash(patientId: string): Promise<DemographicsRecord | null> {
  try {
    const account = await server.loadAccount(/* account id */);
    const dataEntry = account.dataAttrs?.[`demographics_${patientId}`];
    if (!dataEntry) return null;

    return {
      patientId,
      hash: dataEntry.toString(),
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getDemographicsHistory(patientId: string): Promise<DemographicsRecord[]> {
  const operations = await server.operations();
  const records: DemographicsRecord[] = [];

  for (const op of operations.records) {
    if (
      op.type === "manage_data" &&
      (op as any).name === `demographics_${patientId}`
    ) {
      records.push({
        patientId,
        hash: (op as any).value,
        lastUpdated: op.created_at,
        txHash: op.transaction_hash,
      });
    }
  }

  return records.sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );
}
