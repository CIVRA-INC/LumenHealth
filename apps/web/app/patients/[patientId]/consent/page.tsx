import { ConsentPageClient } from "./consent-page-client";

export default function ConsentPage({
  params,
}: {
  params: { patientId: string };
}) {
  return (
    <main className="authPage">
      <h1>Consent &amp; Privacy</h1>
      <ConsentPageClient patientId={params.patientId} />
    </main>
  );
}
