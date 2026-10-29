"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import type { CertificateRow, RankHistoryRow } from "@/modules/leaders/components/leader-detail-utils";

export type MyLeaderProfile = {
  id: string;
  status?: boolean | null;
  holyName?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  imageUrl?: string | null;
  imageThumbUrl?: string | null;
  imageAssetId?: string | null;
  gender?: string | null;
  leaderLevel?: string | null;
  deaneryName?: string | null;
  parishName?: string | null;
};

export type MyRole = {
  code: string;
  name: string;
  primary: boolean;
};

export type MyProfile = {
  username: string;
  /** Vai trò chính luôn đứng đầu. */
  roles: MyRole[];
  email: string | null;
  hasLeader: boolean;
  // Ảnh đại diện của tài khoản không gắn huynh trưởng (tài khoản gắn huynh trưởng dùng ảnh trong hồ sơ huynh trưởng).
  imageUrl?: string | null;
  imageThumbUrl?: string | null;
  imageAssetId?: string | null;
  leader: MyLeaderProfile | null;
  rankHistory: RankHistoryRow[];
  certificates: CertificateRow[];
};

export type PasswordOtpSendResult = {
  email: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export type PasswordOtpVerifyResult = {
  changeToken: string;
  expiresInSeconds: number;
};

/** Endpoint chi tiết chứng nhận của chính mình (dùng cho CertificateDetailDrawer). */
export const MY_CERTIFICATE_ENDPOINT = "/auth/me/certificates";

export const myProfileQueryKey = ["auth", "me", "profile"] as const;

/** Hồ sơ của tài khoản đang đăng nhập, dùng cho menu tài khoản và trang /profile. */
export function useMyProfile() {
  const username = useAuthStore((state) => state.user?.username);
  return useQuery({
    queryKey: [...myProfileQueryKey, username],
    queryFn: () => apiFetch<MyProfile>("/auth/me/profile"),
    enabled: Boolean(username),
    staleTime: 5 * 60_000,
  });
}

function postJson<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export type MyProfileUpdate = Partial<{
  holyName: string;
  fullName: string;
  birthDate: string;
  gender: string;
  email: string;
  phoneNumber: string;
  imageAssetId: string;
  currentPassword: string;
}>;

export const profileApi = {
  // Chỉ gửi các trường đổi. Giáo xứ / giáo hạt không sửa được ở đây.
  update: (changes: MyProfileUpdate) => apiFetch<MyProfile>("/auth/me/profile", { method: "PUT", body: JSON.stringify(changes) }),
};

export const avatarApi = {
  // Đặt ảnh đại diện cho tài khoản không gắn huynh trưởng (ảnh đã tải lên qua /media, loại ACCOUNT_AVATAR). Chỉ thay, không xóa.
  update: (imageAssetId: string) => apiFetch<MyProfile>("/auth/me/avatar", { method: "PUT", body: JSON.stringify({ imageAssetId }) }),
};

export const emailApi = {
  update: (email: string, currentPassword: string) =>
    apiFetch<{ email: string }>("/auth/me/email", { method: "PUT", body: JSON.stringify({ email, currentPassword }) }),
};

export const passwordChangeApi = {
  sendOtp: (oldPassword: string) => postJson<PasswordOtpSendResult>("/auth/password/otp", { oldPassword }),
  verifyOtp: (otp: string) => postJson<PasswordOtpVerifyResult>("/auth/password/otp/verify", { otp }),
  change: (changeToken: string, newPassword: string, confirmPassword: string) =>
    postJson<null>("/auth/password/change", { changeToken, newPassword, confirmPassword }),
};
