import { apiFetch } from "@/lib/api/client";

export type ForgotPasswordOtpResult = {
  /** Email đã được BE che (vd: ng***@g***.com). */
  maskedEmail: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export type ForgotPasswordVerifyResult = {
  resetToken: string;
  expiresInSeconds: number;
};

function postJson<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

/** Quên mật khẩu (không cần đăng nhập): tên đăng nhập → OTP qua email → mật khẩu mới. Toàn bộ kiểm tra nằm ở BE. */
export const forgotPasswordApi = {
  sendOtp: (username: string) => postJson<ForgotPasswordOtpResult>("/auth/forgot-password/otp", { username }),
  verifyOtp: (username: string, otp: string) => postJson<ForgotPasswordVerifyResult>("/auth/forgot-password/otp/verify", { username, otp }),
  reset: (username: string, resetToken: string, newPassword: string, confirmPassword: string) =>
    postJson<null>("/auth/forgot-password/reset", { username, resetToken, newPassword, confirmPassword }),
};
