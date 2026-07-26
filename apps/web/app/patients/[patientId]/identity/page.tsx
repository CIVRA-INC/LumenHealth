import { PatientIdentityCard } from '../../../src/components/patient-identity-card';
import { mockWebPatientIdentityFixture } from '../../../src/fixtures/patient-identity.fixture';

export default function PatientIdentityPage({
  params,
}: {
  params: { patientId: string };
}) {
  const patient = mockWebPatientIdentityFixture.records.find(
    (r) => r.patientId === params.patientId,
  );

  if (!patient) {
    return (
      <main className="authPage">
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
          Patient not found.
        </div>
      </main>
    );
  }

  return (
    <main className="authPage">
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>
          Patient Identity
        </h1>
        <PatientIdentityCard patient={patient} />
      </div>
    </main>
  );
}
