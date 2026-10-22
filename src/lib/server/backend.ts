import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";
import type { AuthUser } from "@/lib/auth/auth-store";

// Tên cookie khớp cấu hình BE (app.security.cookie.*).
const ACCESS_COOKIE = process.env.AUTH_ACCESS_COOKIE_NAME ?? "accessToken";
export const REFRESH_COOKIE = process.env.AUTH_REFRESH_COOKIE_NAME ?? "refreshToken";

type Envelope<T> = { success: boolean; data: T };

// Gọi BE từ server bằng cookie access token của chính request này. Không refresh (refresh xoay vòng
// refresh token mà Server Component không ghi được cookie): hết hạn hoặc lỗi thì trả null, client tự lấy dữ liệu.
export async function serverFetch<T>(path: string): Promise<T | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(`${serverEnv.BACKEND_ORIGIN}/api${path}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as Envelope<T>;
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

// Một request chỉ hỏi /auth/me một lần dù layout và trang cùng gọi.
export const getServerUser = cache(() => serverFetch<AuthUser>("/auth/me"));
