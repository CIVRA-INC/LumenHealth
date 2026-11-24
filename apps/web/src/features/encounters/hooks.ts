import type { EncounterDetail } from '@lumen/contracts';
import { toast } from '@lumen/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';

export const encounterKey = (id: string) => ['encounter', id] as const;

export function useEncounter(id: string) {
  return useQuery({
    queryKey: encounterKey(id),
    queryFn: () => api.get<EncounterDetail>(`/encounters/${id}`),
    // A signed record does not change under the clinician; drafts may (e.g. a nurse adds vitals).
    refetchInterval: (query) => (query.state.data?.status === 'IN_PROGRESS' ? 20_000 : false),
  });
}

/**
 * A mutation against one encounter. The API returns the refreshed encounter, which replaces the
 * cached copy, so the screen always reflects what the server accepted.
 */
export function useEncounterAction<TVars = void>(
  id: string,
  run: (vars: TVars) => Promise<EncounterDetail>,
  options: { success?: string; silentError?: boolean } = {},
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (encounter) => {
      client.setQueryData(encounterKey(id), encounter);
      void client.invalidateQueries({ queryKey: ['encounters'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
      void client.invalidateQueries({ queryKey: ['queue'] });
      void client.invalidateQueries({ queryKey: ['appointments'] });
      void client.invalidateQueries({ queryKey: ['patient'] });
      if (options.success) toast.success(options.success);
    },
    onError: (error) => {
      if (!options.silentError)
        toast.error('That change was not saved', { description: errorMessage(error) });
    },
  });
}

export const base = (id: string) => `/encounters/${id}`;
