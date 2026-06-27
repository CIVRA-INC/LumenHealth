import { PatientDetail } from "../_components/patient-detail";

export default function PatientDetailPage({
  params,
}: {
  params: { patientId: string };
}) {
  return (
    <main className="authPage">
      <PatientDetail patientId={params.patientId} />
    </main>
  );
}
