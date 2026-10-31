"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { useState } from "react";
import { createMutationCache } from "@/lib/api/mutation-cache";
import { useSyncLeaderLevels } from "@/modules/leader-levels/leader-level-store";

// Tải danh mục cấp độ huynh trưởng một lần để mọi nhãn / ô chọn dùng chung.
function LeaderLevelSync() {
  useSyncLeaderLevels();
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: createMutationCache(),
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
              return status !== 401 && status !== 403 && failureCount < 1;
            },
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LeaderLevelSync />
      <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
