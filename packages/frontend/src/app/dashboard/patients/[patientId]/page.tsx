import PatientProfile from "@/components/patients/PatientProfile";

export default function PatientProfilePage({ params }: { params: { patientId: string } }) {
  return <PatientProfile patientId={params.patientId} />;
}
