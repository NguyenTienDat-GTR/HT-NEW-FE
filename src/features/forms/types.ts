import type { ResourceKind } from "@/features/workspace/routes";
import type { AuthUser } from "@/lib/auth/auth-store";

export type Option = {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export type FieldType = "text" | "email" | "url" | "number" | "date" | "datetime" | "textarea" | "select" | "multiselect" | "checkbox-list" | "radio";

export type FormFieldSpec = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  helper?: string;
  placeholder?: string;
  options?: Option[];
  optionsEndpoint?: string;
  optionValue?: string;
  optionLabel?: string;
  createOnly?: boolean;
  editOnly?: boolean;
  visibleWhen?: (values: Record<string, unknown>, mode: ResourceFormMode) => boolean;
  requiredWhen?: (values: Record<string, unknown>, mode: ResourceFormMode) => boolean;
  readOnlyOnCreate?: boolean;
  readOnlyOnEdit?: boolean;
  clearable?: boolean;
  section?: string;
};

export type ResourceFormMode = "create" | "edit";

export type ResourceFormSpec = {
  kind: ResourceKind;
  moduleName?: string;
  actionType?: "create" | "edit" | "score" | "matrix";
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
