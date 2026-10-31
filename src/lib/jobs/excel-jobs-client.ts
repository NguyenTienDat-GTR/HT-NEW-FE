import { apiFetch, downloadFile, type ApiError } from "@/lib/api/client";

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
