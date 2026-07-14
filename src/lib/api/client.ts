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

async function refreshAccessToken() {
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

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = useAuthStore.getState().accessToken;
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
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch<T>(path, init, false);
    useAuthStore.getState().clear();
  }

  return parseEnvelope<T>(response);
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
