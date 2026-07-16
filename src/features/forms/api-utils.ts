import type { PageResponse } from "@/lib/api/client";
import type { Option } from "./types";

export function rowsFromResponse<T extends Record<string, unknown>>(data: PageResponse<T> | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.content ?? [];
}

export function optionFromRow(row: Record<string, unknown>, valueKey = "id", labelKey = "name", labelFields?: string[]): Option {
  const value = row[valueKey] ?? row.id ?? row.code ?? row.username ?? row.roleCode ?? row.permissionCode;
  const joinedLabel = labelFields
    ?.map((field) => row[field])
    .filter((item) => item !== undefined && item !== null && String(item).trim() !== "")
    .map(String)
    .join(" - ");
  const label = joinedLabel || row[labelKey] || row.name || row.fullName || row.roleName || row.permissionName || row.courseName || row.positionName || value;
  const moduleCode = typeof row.moduleCode === "string" ? row.moduleCode : undefined;
  const resourceCode = typeof row.resourceCode === "string" ? row.resourceCode : undefined;
  return {
    value: String(value ?? ""),
    label: String(label ?? ""),
    group: moduleCode && resourceCode ? `${moduleCode} / ${resourceCode}` : moduleCode,
    disabled: row.disabled === true,
    disabledReason: typeof row.disabledReason === "string" ? row.disabledReason : undefined,
  };
}
