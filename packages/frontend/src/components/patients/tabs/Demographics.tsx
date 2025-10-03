type Patient = {
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    phone: string;
  };
};

export default function Demographics({ patient }: { patient: Patient }) {
  return (
    <div className=&#39;bg-white rounded-2xl shadow p-6 space-y-4&#39;>
      <div className=&#39;flex justify-between items-center&#39;>
        <h2 className=&#39;text-lg font-semibold text-gray-900&#39;>Demographics</h2>
        <button className=&#39;px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700&#39;>
          Edit
        </button>
      </div>

      <dl className=&#39;grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4&#39;>
        <div>
          <dt className=&#39;text-sm font-medium text-gray-500&#39;>Phone</dt>
          <dd className=&#39;mt-1 text-gray-900&#39;>{patient.phone}</dd>
        </div>
        <div>
          <dt className=&#39;text-sm font-medium text-gray-500&#39;>Email</dt>
          <dd className=&#39;mt-1 text-gray-900&#39;>{patient.email}</dd>
        </div>
        <div>
          <dt className=&#39;text-sm font-medium text-gray-500&#39;>Address</dt>
          <dd className=&#39;mt-1 text-gray-900&#39;>{patient.address}</dd>
        </div>
        <div>
          <dt className=&#39;text-sm font-medium text-gray-500&#39;>Emergency Contact</dt>
          <dd className=&#39;mt-1 text-gray-900&#39;>
            {patient.emergencyContact.name} ({patient.emergencyContact.phone})
          </dd>
        </div>
      </dl>
    </div>
  );
}
