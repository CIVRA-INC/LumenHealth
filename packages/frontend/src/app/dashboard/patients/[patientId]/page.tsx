import { Metadata } from &#39;next&#39;;
import PatientHeader from &#39;@/components/patients/PatientHeader&#39;;
import PatientTabs from &#39;@/components/patients/PatientTabs&#39;;

async function getPatient(patientId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${patientId}`, {
    cache: &#39;no-store&#39;,
  });

  if (!res.ok) {
    throw new Error(&#39;Failed to fetch patient&#39;);
  }

  return res.json();
}

export async function generateMetadata({ params }: { params: { patientId: string } }): Promise<Metadata> {
  const patient = await getPatient(params.patientId);
  return {
    title: `${patient.fullName} - Profile`,
  };
}

export default async function PatientPage({ params }: { params: { patientId: string } }) {
  const patient = await getPatient(params.patientId);

  return (
    <div className=&#39;space-y-6 p-6&#39;>
      {/* Header */}
      <PatientHeader patient={patient} />

      {/* Tabs */}
      <PatientTabs patient={patient} />
    </div>
  );
}
