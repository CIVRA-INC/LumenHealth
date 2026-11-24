import type { AppointmentView, EncounterDetail } from '@lumen/contracts';
import { toast } from '@lumen/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';

/** Anything that changes who is waiting or what is scheduled. */
function useRefreshOperations() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['queue'] }),
      client.invalidateQueries({ queryKey: ['appointments'] }),
      client.invalidateQueries({ queryKey: ['dashboard'] }),
      client.invalidateQueries({ queryKey: ['encounters'] }),
    ]);
}

export function useCheckIn() {
  const refresh = useRefreshOperations();
  return useMutation({
    mutationFn: (appointmentId: string) =>
      api.post<AppointmentView>(`/appointments/${appointmentId}/check-in`),
    onSuccess: (appt) => {
      toast.success(`${appt.patient.displayName} checked in`, {
        description: `Queue number ${appt.ticketNumber}`,
      });
      return refresh();
    },
    onError: (error) => toast.error('Could not check in', { description: errorMessage(error) }),
  });
}

/** Opens an encounter. Sends the patient the clinician believes they are opening as a safety check. */
export function useStartEncounter() {
  const refresh = useRefreshOperations();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (appt: Pick<AppointmentView, 'id' | 'patient'>) =>
      api.post<EncounterDetail>('/encounters', {
        appointmentId: appt.id,
        expectedPatientId: appt.patient.id,
      }),
    onSuccess: async (encounter) => {
      await refresh();
      navigate(`/encounters/${encounter.id}`);
    },
    onError: (error) =>
      toast.error('Could not start the consultation', { description: errorMessage(error) }),
  });
}

export function useMarkNoShow() {
  const refresh = useRefreshOperations();
  return useMutation({
    mutationFn: (appointmentId: string) =>
      api.post<AppointmentView>(`/appointments/${appointmentId}/no-show`),
    onSuccess: () => {
      toast.success('Marked as did not attend');
      return refresh();
    },
    onError: (error) =>
      toast.error('Could not update the appointment', { description: errorMessage(error) }),
  });
}

export function useCancelAppointment() {
  const refresh = useRefreshOperations();
  return useMutation({
    mutationFn: (input: {
      id: string;
      outcome: 'CANCELLED_BY_PATIENT' | 'CANCELLED_BY_CLINIC' | 'LEFT_WITHOUT_BEING_SEEN';
      note?: string;
    }) =>
      api.post<AppointmentView>(`/appointments/${input.id}/cancel`, {
        outcome: input.outcome,
        note: input.note,
      }),
    onSuccess: () => {
      toast.success('Appointment cancelled');
      return refresh();
    },
    onError: (error) => toast.error('Could not cancel', { description: errorMessage(error) }),
  });
}

export { useRefreshOperations };
