import { Toaster, TooltipProvider } from '@lumen/ui';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError, setUnauthenticatedHandler } from '../lib/api';
import { SESSION_KEY } from '../lib/session';

function makeClient() {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        retry: (failures, error) =>
          !(error instanceof ApiError && error.status < 500 && error.status !== 0) && failures < 2,
      },
    },
  });
  // When any call finds the session gone, drop cached data and send the user to sign in.
  setUnauthenticatedHandler(() => {
    client.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_KEY[0] });
    client.setQueryData(SESSION_KEY, null);
  });
  return client;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
