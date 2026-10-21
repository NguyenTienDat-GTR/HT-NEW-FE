import type { ResourceKind } from "@/config/routes/routes";
import type { AuthUser } from "@/lib/auth/auth-store";

export type Option = {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export type FieldType = "text" | "email" | "url" | "image" | "number" | "date" | "datetime" | "textarea" | "select" | "multiselect" | "checkbox-list" | "radio" | "switch" | "registration-list";

export type FormFieldSpec = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  helper?: string;
  placeholder?: string;
  min?: number;
  // Trường lập danh sách huynh trưởng bằng modal: courseField = trường chứa mã khóa, otherField = danh sách còn lại (không được trùng người).
  registrationList?: { mode: "standard" | "exception"; courseField: string; otherField: string };
  options?: Option[];
  optionsEndpoint?: string;
  buildOptionsEndpoint?: (values: Record<string, unknown>) => string | undefined;
  optionValue?: string;
  optionLabel?: string;
  optionLabelFields?: string[];
  optionSearchParam?: string;
  excludeOptionValues?: string[];
  excludeOptionValuesWhen?: (user: AuthUser | null) => string[];
  searchable?: boolean;
  primaryFieldName?: string;
  primaryLabel?: string;
  createOnly?: boolean;
  editOnly?: boolean;
  visibleWhen?: (values: Record<string, unknown>, mode: ResourceFormMode) => boolean;
  requiredWhen?: (values: Record<string, unknown>, mode: ResourceFormMode) => boolean;
  readOnlyWhen?: (values: Record<string, unknown>, mode: ResourceFormMode) => boolean;
  readOnlyOnCreate?: boolean;
  readOnlyOnEdit?: boolean;
  clearable?: boolean;
  // Nhãn ô đánh dấu xóa giá trị khi sửa (mặc định "Xóa giá trị khi lưu").
  clearLabel?: string;
  switchLabels?: [string, string];
  // Gợi ý động lấy từ API theo giá trị các trường khác (ví dụ điểm đạt tối đa theo loại khóa).
  dynamicHelper?: {
    buildEndpoint: (values: Record<string, unknown>) => string | undefined;
    format: (data: unknown, values: Record<string, unknown>) => { text: string; invalid?: boolean } | undefined;
  };
  section?: string;
};

export type ResourceFormMode = "create" | "edit";

export type ResourceFormSpec = {
  kind: ResourceKind;
  moduleName?: string;
  actionType?: "create" | "edit" | "score" | "matrix" | "revoke";
  title?: string;
  createTitle?: string;
  editTitle?: string;
  description?: string;
  endpoint?: string;
  buildEndpoint?: (values: Record<string, unknown>, id?: string) => string;
  superAdminOnly?: boolean;
  getInitialValues?: (user: AuthUser | null) => Record<string, unknown>;
  method?: "POST" | "PUT" | "PATCH";
  submitLabel?: string;
  fields: FormFieldSpec[];
  mapSubmit?: (values: Record<string, unknown>, mode: ResourceFormMode) => Record<string, unknown>;
};

export function enumOptions(values: string[]): Option[] {
  return values.map((value) => ({ value, label: value }));
}

const unitTypeLabels: Record<string, string> = {
  DIOCESE: "Giáo phận",
  DEANERY: "Giáo hạt",
  PARISH: "Giáo xứ",
};

export function unitTypeSelectOptions(values: string[]): Option[] {
  return values.map((value) => ({ value, label: unitTypeLabels[value] ?? value }));
}

export function compactPayload(values: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  const clearFields: string[] = [];

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    if (value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && value.trim() === "__CLEAR__") {
      clearFields.push(key);
      continue;
    }
    payload[key] = normalizeValue(key, value);
  }

  if (clearFields.length) payload.clearFields = clearFields;
  return payload;
}

function normalizeValue(key: string, value: unknown) {
  if (typeof value === "string" && key.endsWith("At") && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
    return `${value}:00+07:00`;
  }
  return value;
}
