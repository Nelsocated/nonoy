"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { useState } from "react";
import { ADMIN_CACHE_MAX_AGE, adminStorage } from "@/lib/offline/admin-cache";

// Admin screens fetch with useQuery; results are kept on the device so they still
// show (with "as of") when offline. Read-only: admin edits need a connection.
export function AdminQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: ADMIN_CACHE_MAX_AGE,
            staleTime: 30_000,
            networkMode: "offlineFirst",
          },
        },
      }),
  );
  const [persister] = useState(() =>
    createAsyncStoragePersister({ storage: adminStorage }),
  );
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister, maxAge: ADMIN_CACHE_MAX_AGE }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
