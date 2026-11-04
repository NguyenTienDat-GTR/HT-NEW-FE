"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";

export type PrivacyConsentStatus = {
  /** Phiên bản chính sách hiện hành do BE cấu hình. */
  policyVersion: string;
  /** Đã đồng ý đúng phiên bản hiện hành và chưa rút. */
  consented: boolean;
  consentedVersion: string | null;
  consentedAt: string | null;
};

export const privacyConsentQueryKey = ["auth", "me", "privacy-consent"] as const;

/** Trạng thái đồng ý của tài khoản đang đăng nhập (cổng đồng ý và mục Quyền riêng tư dùng chung). */
export function usePrivacyConsent() {
  const username = useAuthStore((state) => state.user?.username);
  return useQuery({
    queryKey: [...privacyConsentQueryKey, username],
    queryFn: () => apiFetch<PrivacyConsentStatus>("/auth/me/privacy-consent"),
    enabled: Boolean(username),
    staleTime: 5 * 60_000,
    // Lỗi tạm thời không được chặn người dùng: chỉ thử lại vài lần rồi thôi.
    retry: 1,
  });
}

export const privacyApi = {
  accept: () => apiFetch<PrivacyConsentStatus>("/auth/me/privacy-consent", { method: "POST", body: JSON.stringify({ privacyConsent: true }) }),
  withdraw: () => apiFetch<PrivacyConsentStatus>("/auth/me/privacy-consent/withdraw", { method: "POST" }),
};
