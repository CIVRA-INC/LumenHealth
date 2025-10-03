type Patient = {
  id: string;
  upid: string;
  fullName: string;
  age: number;
  gender: string;
};

export default function PatientHeader({ patient }: { patient: Patient }) {
  return (
    <div className=&#39;bg-white rounded-2xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between&#39;>
      <div>
        <h1 className=&#39;text-2xl font-semibold text-gray-900&#39;>{patient.fullName}</h1>
        <p className=&#39;text-gray-600&#39;>UPID: {patient.upid}</p>
        <p className=&#39;text-gray-600&#39;>
          {patient.age} years old · {patient.gender}
        </p>
      </div>
    </div>
  );
}
