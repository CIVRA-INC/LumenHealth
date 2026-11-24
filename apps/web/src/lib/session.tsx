import type { Permission, SessionView } from '@lumen/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from './api';

export const SESSION_KEY = ['session'] as const;

/** The signed-in user, or null when signed out. Resolves once, then stays fresh. */
export function useSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: async (): Promise<SessionView | null> => {
      try {
        return await api.get<SessionView>('/auth/session');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useRequiredSession(): SessionView {
  const { data } = useSession();
  if (!data) throw new Error('useRequiredSession must be used inside an authenticated route');
  return data;
}

export function useCan(permission: Permission): boolean {
  const { data } = useSession();
  return !!data?.permissions.includes(permission);
}

export function useResetSession() {
  const client = useQueryClient();
  return (next: SessionView | null) => {
    // Everything cached belongs to the previous organisation/branch/user.
    client.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_KEY[0] });
    client.setQueryData(SESSION_KEY, next);
  };
}
