import type { ResourceKind, RouteConfig } from "@/config/routes/routes";
import { columnLabels } from "./resource-format";

type Row = Record<string, unknown>;

export const AUDIT_KEYS = ["createdAt", "createdBy", "updatedAt", "updatedBy"] as const;

export function isAuditKey(key: string) {
  return AUDIT_KEYS.some((auditKey) => auditKey === key);
}

// Nhãn riêng của một số loại tài nguyên; còn lại dùng nhãn cột chung.
const LABEL_OVERRIDES: Partial<Record<ResourceKind, Record<string, string>>> = {
  accounts: { primaryRoleName: "Vai trò chính", secondaryRoleNames: "Vai trò phụ" },
  courses: { courseTypeName: "Loại khóa" },
};

export function detailLabel(route: RouteConfig, key: string) {
  return LABEL_OVERRIDES[route.kind]?.[key] ?? columnLabels[key] ?? key;
}

const ACCOUNT_HIDDEN_KEYS = ["leaderId", "leaderFullName", "primaryRoleCode", "roleCodes", "roleNames", "deaneryId", "deaneryName", "parishId", "parishName"];
const COURSE_HIDDEN_KEYS = ["courseCode", "courseTypeCode", "dioceseId", "deaneryId", "registrationOpen"];

// Quy tắc ẩn trường riêng theo loại tài nguyên (true = ẩn).
const HIDE_RULES: Partial<Record<ResourceKind, (key: string, row: Row) => boolean>> = {
  accounts: (key, row) =>
    ACCOUNT_HIDDEN_KEYS.includes(key) ||
    (key === "email" && !row.email) ||
    (key === "secondaryRoleNames" && Array.isArray(row[key]) && row[key].length === 0),
  courses: (key) => COURSE_HIDDEN_KEYS.includes(key),
  "role-permissions": hidePermissionAssignmentKey,
  "account-permissions": hidePermissionAssignmentKey,
};

function hidePermissionAssignmentKey(key: string, row: Row) {
  return key === "id" || (key === "roleCode" && Boolean(row.roleName)) || (key === "permissionCode" && Boolean(row.permissionName));
}

// Mã đơn vị chỉ là dữ liệu kỹ thuật: ẩn khi đã có tên hiển thị tương ứng.
const ID_HIDDEN_WHEN_NAMED: Record<string, string> = {
  dioceseId: "dioceseName",
  deaneryId: "deaneryName",
  parishId: "parishName",
  unitId: "unitName",
};

export function shouldRenderKey(route: RouteConfig, row: Row, key: string) {
  if (row[key] === undefined && !isAuditKey(key)) return false;
  if (HIDE_RULES[route.kind]?.(key, row)) return false;
  if (key === "conditions") return false;
  const nameKey = ID_HIDDEN_WHEN_NAMED[key];
  if (nameKey && typeof row[nameKey] === "string") return false;
  return true;
}
