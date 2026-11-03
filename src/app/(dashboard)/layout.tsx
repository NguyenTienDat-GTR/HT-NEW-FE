import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type React from "react";
import { getServerUser, serverFetch } from "@/lib/server/backend";
import { LEADER_LEVELS_PATH, LEADER_LEVELS_QUERY_KEY } from "@/modules/leader-levels/query-keys";
import { AppShell } from "@/modules/workspace/components/app-shell";
import { AuthGate } from "@/modules/workspace/components/auth-gate";

// Render HTML kèm người dùng và danh mục cấp độ đọc từ cookie phiên: không phải chờ JS rồi mới gọi /auth/me.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  // Hai lời gọi độc lập (cùng dùng cookie phiên) chạy song song: không có phiên hoặc hết hạn thì cả hai trả null/bỏ qua,
  // nên không phải chờ /auth/me xong mới tải danh mục cấp độ (tiết kiệm một vòng gọi BE mỗi lần tải trang).
  const [user] = await Promise.all([
    getServerUser(),
    queryClient.prefetchQuery({ queryKey: LEADER_LEVELS_QUERY_KEY, queryFn: () => serverFetch(LEADER_LEVELS_PATH).then((data) => data ?? Promise.reject(new Error("skip"))) }),
  ]);

  return (
    <AuthGate initialUser={user}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AppShell>{children}</AppShell>
      </HydrationBoundary>
    </AuthGate>
  );
}
