export class PatientIdentityStellarService {
  async anchorIdentity(patientId: string, publicKey: string) {
    return {
      anchored: true,
      txHash: `tx_${patientId}_${Date.now()}`,
    };
  }
}
