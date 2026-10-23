"use client";

import createClient from "openapi-fetch";
import { toast } from "sonner";
import type { paths } from "./schema";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string | null;
  errorCode?: string | null;
  data: T;
  timestamp?: string;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
};

export type ApiError = Error & {
  status?: number;
  errorCode?: string | null;
};

export const openapi = createClient<paths>({ baseUrl: "/backend" });

let refreshPromise: Promise<string | null> | null = null;

export function getApiErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Không thể hoàn tất yêu cầu";
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch("/backend/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const envelope = (await response.json()) as ApiEnvelope<{ accessToken: string; user?: AuthUser }>;
        const token = envelope.data?.accessToken ?? null;
        useAuthStore.getState().setAccessToken(token);
        if (envelope.data?.user) useAuthStore.getState().setUser(envelope.data.user);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function parseEnvelope<T>(response: Response) {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || body?.success === false) {
    const message = body?.message ?? statusMessage(response.status);
    throw Object.assign(new Error(message), {
      status: response.status,
      errorCode: body?.errorCode,
    }) satisfies ApiError;
  }
  return body?.data as T;
}

function statusMessage(status: number) {
  if (status === 401) return "Phiên đăng nhập đã hết hạn";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này";
  if (status === 404) return "Dữ liệu không còn tồn tại";
  if (status === 409) return "Dữ liệu đã thay đổi, vui lòng tải lại";
  if (status === 429) return "Hệ thống đang bận, vui lòng thử lại sau";
  return "Không thể hoàn tất yêu cầu";
}

// Chưa có access token trong bộ nhớ (vừa tải lại trang, hoặc phiên vừa bị xóa): lấy token bằng refresh cookie trước,
// khỏi gửi một loạt request chắc chắn bị 401 rồi mới refresh. Các API xác thực tự quản lý token nên bỏ qua.
async function currentAccessToken(path: string) {
  const token = useAuthStore.getState().accessToken;
  if (token || path.startsWith("/auth/")) return token;
  return (await refreshAccessToken()) ?? useAuthStore.getState().accessToken;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = await currentAccessToken(path);
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (token) headers.set("authorization", `Bearer ${token}`);

  const response = await fetch(`/backend/api${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && retry) {
    // Token đã đổi trong lúc request bay (vừa đăng nhập lại): gửi lại bằng token mới, không refresh và không xóa phiên mới.
    const current = useAuthStore.getState().accessToken;
    if (current && current !== token) return apiFetch<T>(path, init, false);
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch<T>(path, init, false);
    if (useAuthStore.getState().accessToken === token) useAuthStore.getState().clear();
  }

  return parseEnvelope<T>(response);
}

// Tải nhị phân (ví dụ PDF). Trả về Response thô để đọc blob và header Content-Disposition.
export async function apiDownload(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await currentAccessToken(path);
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (token) headers.set("authorization", `Bearer ${token}`);

  const response = await fetch(`/backend/api${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && retry) {
    const current = useAuthStore.getState().accessToken;
    if (current && current !== token) return apiDownload(path, init, false);
    const newToken = await refreshAccessToken();
    if (newToken) return apiDownload(path, init, false);
    if (useAuthStore.getState().accessToken === token) useAuthStore.getState().clear();
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
    throw Object.assign(new Error(body?.message ?? statusMessage(response.status)), {
      status: response.status,
      errorCode: body?.errorCode,
    }) satisfies ApiError;
  }

  return response;
}

// Rút tên file từ header Content-Disposition (ưu tiên filename* UTF-8).
export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1]?.trim() ?? null;
}

export async function apiMutation<T>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown) {
  try {
    return await apiFetch<T>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    toast.error(getApiErrorMessage(error));
    throw error;
  }
}
