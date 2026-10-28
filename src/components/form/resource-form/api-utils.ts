import type { PageResponse } from "@/lib/api/client";
import { formatPermissionTaxonomyValue } from "@/components/common/resource/permission-taxonomy-labels";
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
  const actionCode = typeof row.actionCode === "string" ? row.actionCode : undefined;
  const scopeCode = typeof row.scopeCode === "string" ? row.scopeCode : undefined;
  return {
    value: String(value ?? ""),
    label: String(label ?? ""),
    // Nhóm quyền theo phân hệ / đối tượng, hiển thị bằng tiếng Việt.
    group: moduleCode && resourceCode
      ? `${formatPermissionTaxonomyValue("module", moduleCode)} / ${formatPermissionTaxonomyValue("resource", resourceCode)}`
      : moduleCode
        ? formatPermissionTaxonomyValue("module", moduleCode)
        : undefined,
    disabled: row.disabled === true,
    disabledReason: typeof row.disabledReason === "string" ? row.disabledReason : undefined,
    details: accountDetails(row),
    taxonomy: moduleCode || resourceCode || actionCode || scopeCode ? { module: moduleCode, resource: resourceCode, action: actionCode, scope: scopeCode } : undefined,
  };
}

// Thông tin phụ của tài khoản trong ô tìm tài khoản: vai trò, huynh trưởng gắn với tài khoản, giáo xứ, giáo hạt.
function accountDetails(row: Record<string, unknown>): string[] | undefined {
  if (typeof row.username !== "string" || "permissionCode" in row) return undefined;
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
  const roles = Array.isArray(row.roleNames) ? row.roleNames.map(text).filter(Boolean).join(", ") : text(row.primaryRoleName);
  const leader = [text(row.leaderHolyName), text(row.leaderFullName)].filter(Boolean).join(" ");
  const details = [
    roles ? `Vai trò: ${roles}` : undefined,
    leader ? `Huynh trưởng: ${leader}` : undefined,
    text(row.parishName) ? `Giáo xứ / giáo họ / giáo điểm: ${text(row.parishName)}` : undefined,
    text(row.deaneryName) ? `Giáo hạt: ${text(row.deaneryName)}` : undefined,
  ].filter((item): item is string => Boolean(item));
  return details.length > 0 ? details : undefined;
}
