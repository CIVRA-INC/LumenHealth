import type {
  CreatePatientRequest,
  PatientDemographics,
  PatientListResponse,
  UpdatePatientRequest,
} from '../types/patient-demographics.types.js';

export class InMemoryPatientRepository {
  private readonly store = new Map<string, PatientDemographics>();

  public async create(
    id: string,
    data: CreatePatientRequest,
  ): Promise<PatientDemographics> {
    const now = new Date().toISOString();
    const patient: PatientDemographics = {
      patientId: id,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bloodType: data.bloodType,
      phone: data.phone,
      email: data.email,
      address: data.address,
      emergencyContact: data.emergencyContact,
      insuranceInfo: data.insuranceInfo,
      medicalRecordNumber: id,
      clinicId: data.clinicId,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(id, patient);
    return patient;
  }

  public async findById(patientId: string): Promise<PatientDemographics | null> {
    return this.store.get(patientId) ?? null;
  }

  public async findByClinicId(clinicId: string): Promise<PatientDemographics[]> {
    return [...this.store.values()].filter((p) => p.clinicId === clinicId);
  }

  public async update(
    patientId: string,
    data: UpdatePatientRequest,
  ): Promise<PatientDemographics | null> {
    const existing = this.store.get(patientId);
    if (!existing) return null;

    const updated: PatientDemographics = {
      ...existing,
      ...data,
      emergencyContact: data.emergencyContact ?? existing.emergencyContact,
      insuranceInfo: data.insuranceInfo ?? existing.insuranceInfo,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(patientId, updated);
    return updated;
  }

  public async delete(patientId: string): Promise<boolean> {
    return this.store.delete(patientId);
  }

  public async list(params: {
    clinicId: string;
    page?: number;
    pageSize?: number;
    search?: string;
    gender?: string;
  }): Promise<PatientListResponse> {
    const { clinicId, page = 1, pageSize = 20, search, gender } = params;
    let patients = await this.findByClinicId(clinicId);

    if (search) {
      const lower = search.toLowerCase();
      patients = patients.filter(
        (p) =>
          p.firstName.toLowerCase().includes(lower) ||
          p.lastName.toLowerCase().includes(lower),
      );
    }

    if (gender) {
      patients = patients.filter((p) => p.gender === gender);
    }

    const total = patients.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paged = patients.slice(start, start + pageSize);

    return {
      patients: paged,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}
