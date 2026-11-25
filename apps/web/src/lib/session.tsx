import type {
  AnySessionView,
  Permission,
  PlatformPermission,
  PlatformSessionView,
  SessionView,
} from '@lumen/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from './api';

export const SESSION_KEY = ['session'] as const;

const sessionQuery = {
  queryKey: SESSION_KEY,
  queryFn: async (): Promise<AnySessionView | null> => {
    try {
      return await api.get<AnySessionView>('/auth/session');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  staleTime: 5 * 60_000,
  retry: false,
};

/** Whoever is signed in (a hospital user or a platform operator), or null when signed out. */
export function useAnySession() {
  return useQuery(sessionQuery);
}

/** The signed-in HOSPITAL user, or null when signed out or signed in as a platform operator. */
export function useSession() {
  return useQuery({
    ...sessionQuery,
    select: (s): SessionView | null => (s?.scope === 'ORGANIZATION' ? s : null),
  });
}

/** The signed-in platform operator, or null. */
export function usePlatformSession() {
  return useQuery({
    ...sessionQuery,
    select: (s): PlatformSessionView | null => (s?.scope === 'PLATFORM' ? s : null),
  });
}

export function useCanPlatform(permission: PlatformPermission): boolean {
  const { data } = usePlatformSession();
  return !!data?.permissions.includes(permission);
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
  return (next: AnySessionView | null) => {
    // Everything cached belongs to the previous organisation/branch/user.
    client.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_KEY[0] });
    client.setQueryData(SESSION_KEY, next);
  };
}
