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
  // Dữ liệu kèm theo lỗi (ví dụ danh sách dòng lỗi khi import Excel).
  details?: unknown;
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
      details: body?.data,
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

// Tải file về máy (xuất Excel...): trả về tên file thực tế lấy từ header Content-Disposition.
export async function downloadFile(path: string, fallbackName: string) {
  const response = await apiDownload(path);
  const blob = await response.blob();
  const filename = parseContentDispositionFilename(response.headers.get("content-disposition")) ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}

// Một dòng lỗi khi import Excel: sheet, số dòng (theo Excel), cột và nội dung.
export type ImportErrorRow = { sheet: string; row: number; column: string; message: string };

// Cảnh báo riêng của ảnh khi import: dữ liệu vẫn được lưu, chỉ hồ sơ này không có ảnh.
export type AvatarWarning = { row: number; fullName: string; fileName: string; reason: string };

export type AvatarJobStatus = "PENDING" | "RUNNING" | "DONE";

export type ExcelJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

// Tác vụ Excel chạy nền (xuất / nhập) do backend quản lý.
export type ExcelJob = {
  id: string;
  kind: string;
  label: string;
  importJob: boolean;
  target?: string | null;
  status: ExcelJobStatus;
  processed: number;
  total: number;
  // Ảnh đại diện được xử lý sau khi dữ liệu Excel đã lưu: job có thể SUCCEEDED trong khi ảnh còn đang gắn.
  avatarStatus?: AvatarJobStatus | null;
  avatarProcessed?: number | null;
  avatarTotal?: number | null;
  avatarSucceeded?: number | null;
  avatarWarnings?: AvatarWarning[] | null;
  warning?: string | null;
  errorMessage?: string | null;
  errors?: ImportErrorRow[] | null;
  created?: number | null;
  resultMessage?: string | null;
  downloadable: boolean;
  fileName?: string | null;
  createdAt?: string | null;
  finishedAt?: string | null;
  expiresAt?: string | null;
  replayed: boolean;
};

export const EXCEL_JOB_TERMINAL: ExcelJobStatus[] = ["SUCCEEDED", "FAILED", "CANCELLED"];

// Khóa idempotency: sinh một lần cho mỗi ý định của người dùng và dùng lại khi gửi lại, để bấm đúp / retry không thực hiện hai lần.
export function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// Tạo tác vụ xuất Excel nền (POST, không có body); backend trả 202 kèm tác vụ.
export function createExcelExportJob(path: string, idempotencyKey: string) {
  return apiFetch<ExcelJob>(path, { method: "POST", headers: { "Idempotency-Key": idempotencyKey } });
}

// Tải file Excel (kèm ZIP ảnh đại diện nếu có) lên và tạo tác vụ nhập nền (multipart).
export function createExcelImportJob(path: string, file: File, idempotencyKey: string, images?: File | null) {
  const form = new FormData();
  form.append("file", file);
  if (images) form.append("images", images);
  return apiFetch<ExcelJob>(path, { method: "POST", body: form, headers: { "Idempotency-Key": idempotencyKey } });
}

export function fetchExcelJob(id: string) {
  return apiFetch<ExcelJob>(`/excel-jobs/${encodeURIComponent(id)}`);
}

export function cancelExcelJob(id: string) {
  return apiFetch<ExcelJob>(`/excel-jobs/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}

export function downloadExcelJobFile(id: string, fallbackName: string) {
  return downloadFile(`/excel-jobs/${encodeURIComponent(id)}/file`, fallbackName);
}

export function importErrorRows(error: unknown): ImportErrorRow[] {
  const details = (error as ApiError | undefined)?.details;
  return Array.isArray(details) ? (details as ImportErrorRow[]) : [];
}

// Khóa idempotency theo "ý định" (đường dẫn + nội dung): gửi lại đúng yêu cầu đó (bấm đúp, retry sau lỗi mạng) dùng lại cùng khóa nên
// backend chỉ thực hiện một lần; đổi nội dung thì sinh khóa mới. Khóa bị xóa khi thành công.
const intentKeys = new Map<string, string>();

export async function apiMutationOnce<T>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown) {
  const intent = `${method} ${path} ${JSON.stringify(body ?? null)}`;
  let key = intentKeys.get(intent);
  if (!key) {
    key = newIdempotencyKey();
    intentKeys.set(intent, key);
  }
  const result = await apiMutation<T>(path, method, body, { idempotencyKey: key });
  intentKeys.delete(intent);
  return result;
}

export async function apiMutation<T>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown, options?: { idempotencyKey?: string }) {
  try {
    return await apiFetch<T>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : undefined,
    });
  } catch (error) {
    toast.error(getApiErrorMessage(error));
    throw error;
  }
}
