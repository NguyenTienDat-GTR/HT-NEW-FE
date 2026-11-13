import { apiDownload, apiFetch, downloadFile } from "@/lib/api/client";

export type TemplateFieldKind = "CELL" | "COLUMN";

export type TemplateField = { key: string; label: string; group: string; kind: TemplateFieldKind };

export type TemplateUnitType = "DIOCESE" | "DEANERY";

export type TemplateUnit = { unitType: TemplateUnitType; unitId: string } | null;

export type RegistrationTemplate = {
  unitType: TemplateUnitType;
  unitId: string;
  unitName: string;
  configured: boolean;
  fileName?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

const BASE = "/training/registration-template";

// Super admin chỉ định đơn vị; tài khoản khác không gửi gì (backend dùng đơn vị của chính họ).
function withUnit(path: string, unit?: TemplateUnit) {
  if (!unit) return path;
  const query = `unitType=${unit.unitType}&unitId=${encodeURIComponent(unit.unitId)}`;
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}

export function fetchRegistrationTemplate(unit?: TemplateUnit) {
  return apiFetch<RegistrationTemplate>(withUnit(BASE, unit));
}

export function fetchTemplateFields() {
  return apiFetch<TemplateField[]>(`${BASE}/fields`);
}

/** Lưu toàn bộ file mẫu do trình soạn tạo ra. */
export function saveTemplateFile(buffer: ArrayBuffer, unit?: TemplateUnit) {
  const form = new FormData();
  form.append("file", new File([buffer], "mau-danh-sach-dang-ky.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  return apiFetch<RegistrationTemplate>(withUnit(`${BASE}/file`, unit), { method: "PUT", body: form });
}

export function deleteRegistrationTemplate(unit?: TemplateUnit) {
  return apiFetch<void>(withUnit(BASE, unit), { method: "DELETE" });
}

export async function fetchTemplateBuffer(unit?: TemplateUnit) {
  const response = await apiDownload(withUnit(`${BASE}/file`, unit));
  return response.arrayBuffer();
}

export function downloadTemplateFile(fileName: string, unit?: TemplateUnit) {
  return downloadFile(withUnit(`${BASE}/file`, unit), fileName);
}
