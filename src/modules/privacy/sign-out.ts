import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";

/** Đăng xuất phía client (cùng cách với app-shell): xóa cache và bộ nhớ, điều hướng cứng để bỏ Router Cache của tài khoản cũ. */
export async function signOutAndRedirect(queryClient: QueryClient) {
  try {
    await apiFetch<null>("/auth/logout", { method: "POST" });
  } catch {
    // BE thu hồi phiên khi token còn hợp lệ; client luôn xóa bộ nhớ.
  } finally {
    queryClient.clear();
    useAuthStore.getState().clear();
    window.location.assign("/login");
  }
}
