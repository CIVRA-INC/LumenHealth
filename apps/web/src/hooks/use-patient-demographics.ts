'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PatientDemographics,
  PatientDemographicsResponse,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientListQuery,
} from '@qyou/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const PATIENTS_KEY = 'patients';

async function fetchPatient(patientId: string): Promise<PatientDemographics> {
  const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}`);
  if (!res.ok) throw new Error('Failed to fetch patient');
  const body: PatientDemographicsResponse = await res.json();
  if (!body.success || !body.data) throw new Error(body.error ?? 'Patient not found');
  return body.data as PatientDemographics;
}

async function createPatientApi(data: CreatePatientRequest): Promise<PatientDemographics> {
  const res = await fetch(`${API_BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create patient');
  const body: PatientDemographicsResponse = await res.json();
  if (!body.success || !body.data) throw new Error(body.error ?? 'Create failed');
  return body.data as PatientDemographics;
}

async function updatePatientApi(
  patientId: string,
  data: UpdatePatientRequest,
): Promise<PatientDemographics> {
  const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update patient');
  const body: PatientDemographicsResponse = await res.json();
  if (!body.success || !body.data) throw new Error(body.error ?? 'Update failed');
  return body.data as PatientDemographics;
}

async function listPatientsApi(query?: PatientListQuery): Promise<PatientDemographicsResponse> {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.gender) params.set('gender', query.gender);
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));

  const res = await fetch(`${API_BASE_URL}/api/patients?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to list patients');
  return res.json();
}

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: [PATIENTS_KEY, patientId],
    queryFn: () => fetchPatient(patientId),
    enabled: !!patientId,
  });
}

export function useListPatients(query?: PatientListQuery) {
  return useQuery({
    queryKey: [PATIENTS_KEY, 'list', query],
    queryFn: () => listPatientsApi(query),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPatientApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PATIENTS_KEY] });
    },
  });
}

export function useUpdatePatient(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePatientRequest) => updatePatientApi(patientId, data),
    onSuccess: (updatedPatient) => {
      queryClient.setQueryData([PATIENTS_KEY, patientId], updatedPatient);
      queryClient.invalidateQueries({ queryKey: [PATIENTS_KEY] });
    },
  });
}
