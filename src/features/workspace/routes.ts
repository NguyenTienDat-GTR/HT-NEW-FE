import {
  Bell,
  Buildings,
  Calculator,
  Certificate,
  ChartBar,
  ChartLineUp,
  ClipboardText,
  Crown,
  FileText,
  GraduationCap,
  IdentificationCard,
  ListChecks,
  LockKey,
  Medal,
  ShieldCheck,
  SquaresFour,
  UsersThree,
} from "@phosphor-icons/react";

export type ResourceKind =
  | "dashboard"
  | "analytics"
  | "notifications"
  | "dioceses"
  | "deaneries"
  | "parishes"
  | "positions"
  | "executive-board"
  | "leaders"
  | "courses"
  | "requirements"
  | "score-components"
  | "score-formulas"
  | "participations"
  | "certificates"
  | "accounts"
  | "roles"
  | "permissions"
  | "account-roles"
  | "role-permissions"
  | "account-permissions"
  | "audit-logs";

export type RouteConfig = {
  path: string;
  title: string;
  subtitle: string;
  endpoint?: string;
  permissionPrefixes: string[];
  kind: ResourceKind;
  icon: typeof SquaresFour;
  columns: string[];
  searchFields?: string[];
};

export const routes: RouteConfig[] = [
  {
    path: "/dashboard",
    title: "Tổng quan",
    subtitle: "KPI vận hành theo scope hiện tại",
    permissionPrefixes: ["analytics.dashboard.read.", "organization."],
    kind: "dashboard",
    icon: SquaresFour,
    columns: [],
  },
  {
    path: "/analytics",
    title: "Phân tích",
    subtitle: "So sánh tăng trưởng, breakdown và trend theo dữ liệu thật",
    permissionPrefixes: ["analytics.dashboard.read."],
    kind: "analytics",
    icon: ChartLineUp,
    columns: [],
  },
  {
    path: "/notifications",
    title: "Thông báo",
    subtitle: "Inbox workflow và realtime notification",
    endpoint: "/system/notifications",
    permissionPrefixes: [],
    kind: "notifications",
    icon: Bell,
    columns: ["title", "eventType", "courseCode", "readAt", "createdAt"],
  },
  route("/organization/dioceses", "Giáo phận", "Quản lí giáo phận", "/dioceses", "dioceses", Buildings, [
    "name",
    "chaplain",
    "phoneNumber",
    "email",
    "status",
  ]),
  route("/organization/deaneries", "Giáo hạt", "Quản lí giáo hạt theo giáo phận", "/deaneries", "deaneries", Buildings, [
    "name",
    "associationName",
    "dioceseId",
    "status",
  ]),
  route("/organization/parishes", "Giáo xứ", "Quản lí giáo xứ theo giáo hạt", "/parishes", "parishes", Buildings, [
    "name",
    "chapterName",
    "deaneryId",
    "status",
  ]),
  route("/organization/positions", "Chức vụ", "Chức vụ theo cấp tổ chức", "/positions", "positions", Crown, [
    "positionName",
    "positionType",
    "status",
  ]),
  route(
    "/organization/executive-board",
    "Ban điều hành",
    "Phân công chức vụ trong đơn vị",
    "/executive-board/assignments",
    "executive-board",
    IdentificationCard,
    ["leaderFullName", "positionName", "unitType", "startDate", "endDate", "status"],
  ),
  route("/leaders", "Huynh trưởng", "Hồ sơ, avatar URL và trạng thái hoạt động", "/leaders", "leaders", UsersThree, [
    "fullName",
    "holyName",
    "gender",
    "leaderLevel",
    "parishId",
    "status",
  ]),
  route("/training/courses", "Khóa học", "Thiết lập khóa và cửa sổ đăng ký", "/training/courses", "courses", GraduationCap, [
    "courseCode",
    "courseName",
    "courseType",
    "hostYear",
    "status",
  ]),
  route(
    "/training/requirements",
    "Điều kiện khóa",
    "Điều kiện level, tuổi, thâm niên và tiên quyết",
    "/training/requirements",
    "requirements",
    ListChecks,
    ["requirementCode", "requirementName", "courseType", "status"],
  ),
  route(
    "/training/score-components",
    "Thành phần điểm",
    "Biến điểm reusable cho công thức",
    "/training/score-components",
    "score-components",
    ChartBar,
    ["code", "name", "maxScore", "unitType", "status"],
  ),
  route(
    "/training/score-formulas",
    "Công thức điểm",
    "Formula editor và trạng thái khóa",
    "/training/score-formulas",
    "score-formulas",
    Calculator,
    ["code", "name", "passingScore", "locked", "status"],
  ),
  route(
    "/training/participations",
    "Hồ sơ tham dự",
    "Duyệt, chấm điểm và khóa theo chứng chỉ",
    "/training/participations",
    "participations",
    ClipboardText,
    ["leaderFullName", "courseName", "participationStatus", "totalScore", "passed", "certificateApprovalStatus"],
  ),
  route("/certificates", "Chứng chỉ", "Score, pass signal và duyệt ngoại lệ", "/certificates", "certificates", Certificate, [
    "certificateCode",
    "leaderFullName",
    "courseName",
    "totalScore",
    "passingScore",
    "approvalStatus",
  ]),
  route("/system/accounts", "Tài khoản", "Account, scope và primary role", "/system/accounts", "accounts", ShieldCheck, [
    "username",
    "leaderFullName",
    "primaryRoleCode",
    "dioceseId",
    "deaneryId",
    "parishId",
    "status",
  ]),
  route("/system/roles", "Vai trò", "Role nghiệp vụ và thứ tự hiển thị", "/system/roles", "roles", LockKey, [
    "roleCode",
    "roleName",
    "displayOrder",
    "status",
  ]),
  route("/system/permissions", "Quyền", "Permission code do backend sinh", "/system/permissions", "permissions", LockKey, [
    "permissionCode",
    "permissionName",
    "moduleCode",
    "resourceCode",
    "scopeCode",
    "status",
  ]),
  route("/system/account-roles", "Gán vai trò", "Role assignment theo scope", "/system/account-roles", "account-roles", ShieldCheck, [
    "username",
    "roleCode",
    "isPrimary",
    "expiresAt",
    "status",
  ]),
  route("/system/role-permissions", "Quyền của vai trò", "Grant hoặc revoke permission cho role", "/system/role-permissions", "role-permissions", LockKey, [
    "roleCode",
    "permissionCode",
    "effect",
    "expiresAt",
    "status",
  ]),
  route(
    "/system/account-permissions",
    "Quyền trực tiếp",
    "ALLOW hoặc DENY theo account",
    "/system/account-permissions",
    "account-permissions",
    Medal,
    ["username", "permissionCode", "effect", "reason", "expiresAt", "status"],
  ),
  route("/system/audit-logs", "Audit log", "Lịch sử thao tác trong 10 ngày gần nhất", "/system/audit-logs", "audit-logs", FileText, [
    "username",
    "action",
    "resourceType",
    "unitType",
    "loggedAt",
  ]),
];

function route(
  path: string,
  title: string,
  subtitle: string,
  endpoint: string,
  kind: ResourceKind,
  icon: typeof SquaresFour,
  columns: string[],
): RouteConfig {
  const prefix = endpoint
    .replace("/system/", "system.")
    .replace("/training/", "training.")
    .replace("/executive-board/", "organization.executive_board_")
    .replace("/", "organization.")
    .replaceAll("/", ".")
    .replaceAll("-", "_");
  return {
    path,
    title,
    subtitle,
    endpoint,
    kind,
    icon,
    columns,
    permissionPrefixes: [prefix],
    searchFields: columns.filter((column) => !column.toLowerCase().includes("status")).slice(0, 3),
  };
}

export function findRoute(path: string) {
  return routes.find((routeConfig) => routeConfig.path === path);
}
