"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<AuthUser>("/auth/me"),
    retry: false,
  });

  useEffect(() => {
    if (!query.data) return;
    setUser(query.data);
    void queryClient.resetQueries({ queryKey: ["resource"] });
  }, [query.data, queryClient, setUser]);

  useEffect(() => {
    if (query.isError) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [pathname, query.isError, router]);

  useEffect(() => {
    if (query.data?.unitLocked && pathname !== "/notifications") router.replace("/notifications");
  }, [pathname, query.data?.unitLocked, router]);

  useEffect(() => {
    if (!query.data?.unitLocked && query.data?.mustChangePassword && pathname !== "/change-password") router.replace("/change-password");
  }, [pathname, query.data?.mustChangePassword, query.data?.unitLocked, router]);

  if (query.isLoading && !user) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-surface-1 text-sm text-muted">
        Đang kiểm tra phiên đăng nhập
      </div>
    );
  }

  return <>{children}</>;
}
