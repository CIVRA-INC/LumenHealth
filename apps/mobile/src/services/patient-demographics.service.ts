import {
  createPatientSchema,
  updatePatientSchema,
  type CreatePatientRequest,
  type UpdatePatientRequest,
  type PatientDemographics,
  type PatientDemographicsResponse,
  type PatientListQuery,
} from '@lumen/types';

const API_BASE_URL = 'http://localhost:4000';

export class PatientDemographicsService {
  private clinicId: string;

  constructor(clinicId: string) {
    this.clinicId = clinicId;
  }

  async createPatient(data: CreatePatientRequest): Promise<PatientDemographics> {
    const validated = createPatientSchema.parse(data);

    const res = await fetch(`${API_BASE_URL}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error ?? `HTTP ${res.status}`);
    }

    const body: PatientDemographicsResponse = await res.json();
    if (!body.success || !body.data) {
      throw new Error(body.error ?? 'Failed to create patient');
    }

    return body.data as PatientDemographics;
  }

  async getPatient(patientId: string): Promise<PatientDemographics> {
    const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}`);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error ?? `HTTP ${res.status}`);
    }

    const body: PatientDemographicsResponse = await res.json();
    if (!body.success || !body.data) {
      throw new Error(body.error ?? 'Patient not found');
    }

    return body.data as PatientDemographics;
  }

  async updatePatient(
    patientId: string,
    data: UpdatePatientRequest,
  ): Promise<PatientDemographics> {
    const validated = updatePatientSchema.parse(data);

    const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error ?? `HTTP ${res.status}`);
    }

    const body: PatientDemographicsResponse = await res.json();
    if (!body.success || !body.data) {
      throw new Error(body.error ?? 'Failed to update patient');
    }

    return body.data as PatientDemographics;
  }

  async listPatients(query?: PatientListQuery): Promise<PatientDemographicsResponse> {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.gender) params.set('gender', query.gender);
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));

    const res = await fetch(`${API_BASE_URL}/api/patients?${params.toString()}`);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error ?? `HTTP ${res.status}`);
    }

    return res.json();
  }

  async deletePatient(patientId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error ?? `HTTP ${res.status}`);
    }
  }
}
