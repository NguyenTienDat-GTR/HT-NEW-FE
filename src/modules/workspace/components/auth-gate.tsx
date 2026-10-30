"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { apiFetch, refreshAccessToken } from "@/lib/api/client";
import { ServerAuthContext, useAuthStore, type AuthUser } from "@/lib/auth/auth-store";
import { resourceKey } from "@/lib/api/query-keys";

// initialUser: người dùng server đã đọc từ cookie phiên khi render HTML (null nếu cookie hết hạn / không có).
export function AuthGate({ children, initialUser }: { children: React.ReactNode; initialUser: AuthUser | null }) {
  // Trình duyệt: đưa người dùng vào store ngay trước khi hydrate để lần render đầu khớp HTML server.
  // Server tuyệt đối không ghi vào store (biến toàn cục dùng chung giữa các request) mà dùng ServerAuthContext.
  if (typeof window !== "undefined" && initialUser && !useAuthStore.getState().user) useAuthStore.getState().setUser(initialUser);

  return (
    <ServerAuthContext.Provider value={initialUser}>
      <AuthGateInner initialUser={initialUser}>{children}</AuthGateInner>
    </ServerAuthContext.Provider>
  );
}

function AuthGateInner({ children, initialUser }: { children: React.ReactNode; initialUser: AuthUser | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      // Chưa có access token trong bộ nhớ (vừa tải lại trang): refresh trước, khỏi gọi một request chắc chắn 401.
      if (!useAuthStore.getState().accessToken) {
        const token = await refreshAccessToken();
        if (!token) throw Object.assign(new Error("Phiên đăng nhập đã hết hạn"), { status: 401 });
      }
      return apiFetch<AuthUser>("/auth/me");
    },
    initialData: initialUser ?? undefined,
    retry: false,
  });

  useEffect(() => {
    if (!query.data) return;
    setUser(query.data);
    void queryClient.resetQueries({ queryKey: resourceKey() });
  }, [query.data, queryClient, setUser]);

  // Server đã cho dữ liệu từ cookie nên chưa cần access token; lấy token ở nền để mở websocket thông báo.
  useEffect(() => {
    if (!initialUser || accessToken) return;
    void refreshAccessToken().then((token) => {
      if (!token) void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (query.isError) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [pathname, query.isError, router]);

  useEffect(() => {
    if (query.data?.unitLocked && pathname !== "/notifications") router.replace("/notifications");
  }, [pathname, query.data?.unitLocked, router]);

  useEffect(() => {
    if (!query.data?.unitLocked && query.data?.mustChangePassword && pathname !== "/change-password") router.replace("/change-password");
  }, [pathname, query.data?.mustChangePassword, query.data?.unitLocked, router]);

  // Chưa biết người dùng (cookie hết hạn: server không render được nội dung): khung chờ thay vì nội dung có quyền sai.
  if (!user && !query.isError) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-surface-1 text-sm text-muted">
        Đang kiểm tra phiên đăng nhập
      </div>
    );
  }

  return <>{children}</>;
}
