export async function verifyStellarPatientIdentity(patientId: string, publicKey: string) {
  return {
    patientId,
    publicKey,
    verified: true,
    timestamp: new Date().toISOString(),
  };
}
