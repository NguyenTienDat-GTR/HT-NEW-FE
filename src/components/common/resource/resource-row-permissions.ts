import type { ResourceKind, RouteConfig } from "@/config/routes/routes";
import type { AuthUser } from "@/lib/auth/auth-store";
import { hasPermission, hasRole, isSuperAdmin } from "@/lib/auth/permissions";

type Row = Record<string, unknown>;
type RowCheck = (route: RouteConfig, row: Row, user: AuthUser | null) => boolean;

const systemRoleCodes = new Set(["SUPER_ADMIN", "ADMIN_DIOCESE", "ADMIN_DEANERY", "ADMIN_PARISH"]);

// Phân quyền đã thu hồi / hết hạn là vĩnh viễn: không sửa, không bật/tắt, chỉ có thể phân quyền mới.
export function isPermanentlyRevokedAssignment(route: RouteConfig, row: Row) {
  return (route.kind === "role-permissions" || route.kind === "account-permissions") && (row.validity === "REVOKED" || row.validity === "EXPIRED");
}

function isSystemRoleRow(route: RouteConfig, row: Row) {
  if (route.kind === "roles") return row.isSystem === true;
  if (route.kind !== "role-permissions") return false;
  return row.roleIsSystem === true || (typeof row.roleCode === "string" && systemRoleCodes.has(row.roleCode));
}

function isOwnAccount(row: Row, user: AuthUser | null) {
  return typeof row.username === "string" && row.username === user?.username;
}

export function rowHasPrimaryRole(row: Row, roleCode: string) {
  return row.primaryRoleCode === roleCode;
}

export function canResetPasswordRow(row: Row, user: AuthUser | null) {
  return row.status === true && !isOwnAccount(row, user) && !rowHasPrimaryRole(row, "SUPER_ADMIN");
}

// Chức vụ và phân công ban điều hành: chỉ thao tác trên dòng thuộc đúng cấp mình được cấp quyền.
function hasScopedRowPermission(route: RouteConfig, user: AuthUser | null, action: "update" | "toggle", row: Row) {
  const level = route.kind === "positions" ? row.positionType : row.unitType;
  if (typeof level !== "string") return false;
  const resource = route.kind === "positions" ? "position" : "executive_board_assignment";
  return hasPermission(user, `organization.${resource}.${action}.${level.toLowerCase()}`);
}

// Quy tắc riêng của từng loại tài nguyên; loại không khai báo dùng quy tắc mặc định bên dưới. Thêm loại mới = thêm một dòng.
type RowRules = { edit?: RowCheck; toggle?: RowCheck };

const ROW_RULES: Partial<Record<ResourceKind, RowRules>> = {
  accounts: { edit: () => false, toggle: (_route, row, user) => !isOwnAccount(row, user) && !rowHasPrimaryRole(row, "SUPER_ADMIN") },
  leaders: { edit: () => false },
  positions: {
    edit: (route, row, user) => hasScopedRowPermission(route, user, "update", row),
    toggle: (route, row, user) => hasScopedRowPermission(route, user, "toggle", row),
  },
  // Phân công là lịch sử nhiệm kì: chỉ vô hiệu hóa (kết thúc) được, phân công đã kết thúc không bật lại.
  "executive-board": { toggle: (route, row, user) => row.status === true && hasScopedRowPermission(route, user, "toggle", row) },
  dioceses: { toggle: (_route, _row, user) => isSuperAdmin(user) },
  deaneries: { toggle: (_route, _row, user) => hasRole(user, "ADMIN_DIOCESE") },
  // Admin giáo hạt bật/tắt giáo xứ trong giáo hạt; admin giáo phận bật/tắt giáo xứ trong giáo phận khi có quyền toggle.diocese.
  parishes: {
    toggle: (_route, _row, user) =>
      hasRole(user, "ADMIN_DEANERY") || (hasRole(user, "ADMIN_DIOCESE") && hasPermission(user, "organization.parish.toggle.diocese")),
  },
};

// Với SUPER_ADMIN, các loại này do cấp dưới quản lý nên không sửa được.
const SUPER_ADMIN_CANNOT_EDIT = new Set<ResourceKind>(["dioceses", "deaneries", "parishes"]);
// Với SUPER_ADMIN, chỉ các loại này được bật/tắt trong nhóm còn lại.
const SUPER_ADMIN_CAN_TOGGLE = new Set<ResourceKind>(["permissions", "account-roles"]);

export function canEditRow(route: RouteConfig, row: Row, user: AuthUser | null) {
  if (isPermanentlyRevokedAssignment(route, row)) return false;
  const rule = ROW_RULES[route.kind]?.edit;
  if (rule) return rule(route, row, user);
  if (!isSuperAdmin(user) && isSystemRoleRow(route, row)) return false;
  if (!isSuperAdmin(user)) return true;
  return !SUPER_ADMIN_CANNOT_EDIT.has(route.kind);
}

export function canToggleRow(route: RouteConfig, row: Row, user: AuthUser | null) {
  const rule = ROW_RULES[route.kind]?.toggle;
  if (rule) return rule(route, row, user);
  if (!isSuperAdmin(user) && isSystemRoleRow(route, row)) return false;
  if (!isSuperAdmin(user)) return true;
  return SUPER_ADMIN_CAN_TOGGLE.has(route.kind);
}
