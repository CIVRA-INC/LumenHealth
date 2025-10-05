type Patient = {
  id?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
};

export default function Demographics({ patient }: { patient: Patient }) {
  const formatDate = (date?: string | Date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className='bg-white rounded-2xl shadow p-6 space-y-4'>
      <div className='flex justify-between items-center'>
        <h2 className='text-lg font-semibold text-gray-900'>Demographics</h2>
        <button className='px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700'>
          Edit
        </button>
      </div>

      <dl className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'>
        <div>
          <dt className='text-sm font-medium text-gray-500'>Full Name</dt>
          <dd className='mt-1 text-gray-900'>{patient.firstName} {patient.lastName}</dd>
        </div>
        <div>
          <dt className='text-sm font-medium text-gray-500'>Date of Birth</dt>
          <dd className='mt-1 text-gray-900'>{formatDate(patient.dateOfBirth)}</dd>
        </div>
        <div>
          <dt className='text-sm font-medium text-gray-500'>Gender</dt>
          <dd className='mt-1 text-gray-900 capitalize'>{patient.gender || "N/A"}</dd>
        </div>
        <div>
          <dt className='text-sm font-medium text-gray-500'>Phone</dt>
          <dd className='mt-1 text-gray-900'>{patient.phone || "N/A"}</dd>
        </div>
        <div>
          <dt className='text-sm font-medium text-gray-500'>Email</dt>
          <dd className='mt-1 text-gray-900'>{patient.email || "N/A"}</dd>
        </div>
        <div>
          <dt className='text-sm font-medium text-gray-500'>Address</dt>
          <dd className='mt-1 text-gray-900'>
            {patient.address && patient.city && patient.state && patient.zipCode
              ? `${patient.address}, ${patient.city}, ${patient.state} ${patient.zipCode}`
              : patient.address || "N/A"}
          </dd>
        </div>
        <div>
          <dt className='text-sm font-medium text-gray-500'>Emergency Contact</dt>
          <dd className='mt-1 text-gray-900'>
            {patient.emergencyContactName
              ? `${patient.emergencyContactName} (${patient.emergencyContactRelationship}) - ${patient.emergencyContactPhone}`
              : "N/A"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
