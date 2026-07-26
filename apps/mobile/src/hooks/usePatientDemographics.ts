import { useState, useEffect, useCallback } from 'react';
import { PatientDemographicsService } from '../services/patient-demographics.service';
import type {
  PatientDemographics,
  PatientDemographicsResponse,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientListQuery,
} from '@lumen/types';

export function usePatientDemographics(clinicId: string) {
  const service = new PatientDemographicsService(clinicId);
  return service;
}

export function usePatient(clinicId: string, patientId: string | null) {
  const service = usePatientDemographics(clinicId);
  const [patient, setPatient] = useState<PatientDemographics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await service.getPatient(patientId);
      setPatient(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient');
    } finally {
      setLoading(false);
    }
  }, [clinicId, patientId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { patient, loading, error, refetch };
}

export function useCreatePatient(clinicId: string) {
  const service = usePatientDemographics(clinicId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (data: CreatePatientRequest): Promise<PatientDemographics | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await service.createPatient(data);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create patient');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [clinicId],
  );

  return { create, loading, error };
}

export function useUpdatePatient(clinicId: string, patientId: string) {
  const service = usePatientDemographics(clinicId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (data: UpdatePatientRequest): Promise<PatientDemographics | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await service.updatePatient(patientId, data);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update patient');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [clinicId, patientId],
  );

  return { update, loading, error };
}

export function useListPatients(clinicId: string, query?: PatientListQuery) {
  const service = usePatientDemographics(clinicId);
  const [result, setResult] = useState<PatientDemographicsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await service.listPatients(query);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list patients');
    } finally {
      setLoading(false);
    }
  }, [clinicId, query?.search, query?.gender, query?.page, query?.limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { patients: result?.data, meta: result?.meta, loading, error, refetch };
}
