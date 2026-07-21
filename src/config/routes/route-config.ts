import type { Icon } from "@phosphor-icons/react";

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

export type ResourceAction = "view" | "create" | "edit" | "toggle" | "delete" | "submit" | "approve" | "score" | "matrix" | "read";

export type ResourceActionConfig = {
  label: string;
  permissionPrefixes?: string[];
  requiredRoles?: string[];
  href?: string;
  route?: string;
  invalidates?: string[];
};

export type RouteFilterOption = {
  value: string;
  label: string;
};

export type RouteFilterConfig = {
  key: string;
  label: string;
  type?: "text" | "select" | "boolean";
  options?: RouteFilterOption[];
  optionsEndpoint?: string;
  optionValue?: string;
  optionLabel?: string;
  placeholder?: string;
};

export type RouteConfig = {
  path: string;
  createPath?: string;
  editPath?: string;
  idField?: string;
  moduleName: string;
  title: string;
  subtitle: string;
  endpoint?: string;
  permissionPrefixes: string[];
  actionPermissionPrefixes?: string[];
  primaryActionPermissionPrefixes?: string[];
  kind: ResourceKind;
  icon: Icon;
  columns: string[];
  searchFields?: string[];
  primaryActionLabel?: string;
  filterLabels?: string[];
  filters?: RouteFilterConfig[];
  workflowHint?: string;
  actions?: Partial<Record<ResourceAction, ResourceActionConfig>>;
};

export type RouteGroup = {
  moduleName: string;
  label: string;
  icon: Icon;
  permissionPrefixes?: string[];
  children: RouteConfig[];
};

export function route(config: RouteConfig): RouteConfig {
  const createPermissionPrefixes =
    config.primaryActionPermissionPrefixes ??
    config.actionPermissionPrefixes?.filter(
      (prefix) => prefix.includes(".create.") || prefix.includes(".manage.") || prefix.includes(".submit.") || prefix.includes(".assign."),
    );
  const updatePermissionPrefixes =
    config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".update.") || prefix.includes(".manage.") || prefix.includes(".assign."));
  const togglePermissionPrefixes = config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".toggle.") || prefix.includes(".update.") || prefix.includes(".manage."));
  const deletePermissionPrefixes =
    config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".delete.") || prefix.includes(".manage.") || prefix.includes(".revoke."));
  const approvePermissionPrefixes = config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".approve."));
  const submitPermissionPrefixes = config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".submit."));
  const scorePermissionPrefixes = config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".score."));

  return {
    ...config,
    createPath: config.createPath ?? (config.primaryActionLabel ? `${config.path}/new` : undefined),
    editPath: config.editPath ?? `${config.path}/:id/edit`,
    idField: config.idField ?? "id",
    actions: {
      view: { label: "Xem chi tiết", permissionPrefixes: config.permissionPrefixes },
      ...(config.primaryActionLabel && createPermissionPrefixes?.length
        ? { create: { label: config.primaryActionLabel, permissionPrefixes: createPermissionPrefixes } }
        : {}),
      ...(updatePermissionPrefixes?.length ? { edit: { label: "Sửa", permissionPrefixes: updatePermissionPrefixes } } : {}),
      ...(togglePermissionPrefixes?.length ? { toggle: { label: "Đổi trạng thái", permissionPrefixes: togglePermissionPrefixes } } : {}),
      ...(deletePermissionPrefixes?.length ? { delete: { label: "Xóa", permissionPrefixes: deletePermissionPrefixes } } : {}),
      ...(approvePermissionPrefixes?.length ? { approve: { label: "Duyệt", permissionPrefixes: approvePermissionPrefixes } } : {}),
      ...(submitPermissionPrefixes?.length ? { submit: { label: "Gửi", permissionPrefixes: submitPermissionPrefixes } } : {}),
      ...(scorePermissionPrefixes?.length ? { score: { label: "Chấm điểm", permissionPrefixes: scorePermissionPrefixes } } : {}),
      ...config.actions,
    },
    searchFields: config.searchFields ?? config.columns.filter((column) => !column.toLowerCase().includes("status")).slice(0, 3),
    filters: config.filters ?? inferRouteFilters(config),
  };
}

function inferRouteFilters(config: RouteConfig): RouteFilterConfig[] {
  const filters: RouteFilterConfig[] = [];
  const columns = new Set(config.columns);

  if (columns.has("status") && config.kind !== "notifications") {
    filters.push({
      key: "status",
      label: "Trạng thái",
      type: "select",
      options: [
        { value: "all", label: "Tất cả" },
        { value: "active", label: "Đang hoạt động" },
        { value: "inactive", label: "Tạm ngưng" },
      ],
    });
  }

  switch (config.kind) {
    case "dioceses":
      filters.push({ key: "unionName", label: "Liên đoàn", type: "text", placeholder: "Lọc theo liên đoàn" });
      break;
    case "deaneries":
      filters.push({ key: "diocese.id", label: "Giáo phận", type: "select", optionsEndpoint: "/dioceses", optionValue: "id", optionLabel: "name" });
      break;
    case "parishes":
      filters.push({ key: "deanery.id", label: "Giáo hạt", type: "select", optionsEndpoint: "/deaneries", optionValue: "id", optionLabel: "name" });
      break;
    case "leaders":
      filters.push({ key: "parish.id", label: "Giáo xứ", type: "select", optionsEndpoint: "/parishes", optionValue: "id", optionLabel: "name" });
      filters.push({
        key: "leaderLevel",
        label: "Cấp HT",
        type: "select",
        options: ["NONE", "HT_XU", "DU_TRUONG", "HT_I", "HT_II", "HT_III", "HLV_I", "HLV_II", "HLV_III"].map((value) => ({ value, label: value })),
      });
      break;
    case "positions":
      filters.push({
        key: "positionType",
        label: "Cấp áp dụng",
        type: "select",
        options: ["DIOCESE", "DEANERY", "PARISH"].map((value) => ({ value, label: value })),
      });
      break;
    case "executive-board":
      filters.push({
        key: "unitType",
        label: "Loại đơn vị",
        type: "select",
        options: ["DIOCESE", "DEANERY", "PARISH"].map((value) => ({ value, label: value })),
      });
      filters.push({ key: "position.positionCode", label: "Mã chức vụ", type: "text", placeholder: "Lọc theo mã chức vụ" });
      break;
    case "requirements":
    case "courses":
      filters.push({
        key: "courseType",
        label: "Loại khóa",
        type: "select",
        options: ["DIOCESE", "DEANERY"].map((value) => ({ value, label: value })),
      });
      if (config.kind === "courses") filters.push({ key: "hostYear", label: "Năm", type: "text", placeholder: "Ví dụ 2026" });
      break;
    case "score-components":
      filters.push({
        key: "unitType",
        label: "Cấp quản lý",
        type: "select",
        options: ["DIOCESE", "DEANERY"].map((value) => ({ value, label: value })),
      });
      break;
    case "score-formulas":
      filters.push({ key: "code", label: "Mã công thức", type: "text", placeholder: "Lọc theo mã" });
      break;
    case "participations":
      filters.push({ key: "course.courseCode", label: "Khóa", type: "text", placeholder: "Lọc theo mã khóa" });
      if (columns.has("participationStatus")) {
        filters.push({
          key: "participationStatus",
          label: "Trạng thái tham dự",
          type: "select",
          options: ["REGISTERED", "ATTENDED", "COMPLETED", "CANCELLED"].map((value) => ({ value, label: value })),
        });
      }
      if (columns.has("deaneryApprovalStatus")) {
        filters.push({
          key: "deaneryApprovalStatus",
          label: "Duyệt giáo hạt",
          type: "select",
          options: ["PENDING", "SUBMITTED", "APPROVED", "REJECTED"].map((value) => ({ value, label: value })),
        });
      }
      if (columns.has("dioceseApprovalStatus")) {
        filters.push({
          key: "dioceseApprovalStatus",
          label: "Duyệt giáo phận",
          type: "select",
          options: ["PENDING", "SUBMITTED", "APPROVED", "REJECTED"].map((value) => ({ value, label: value })),
        });
      }
      if (columns.has("certificateApprovalStatus")) {
        filters.push({
          key: "certificateApprovalStatus",
          label: "Chứng nhận",
          type: "select",
          options: ["PENDING", "SUBMITTED", "APPROVED", "REJECTED", "NOT_REQUIRED"].map((value) => ({ value, label: value })),
        });
      }
      break;
    case "certificates":
      filters.push({ key: "courseCode", label: "Khóa", type: "text", placeholder: "Lọc theo mã khóa" });
      if (columns.has("approvalStatus")) {
        filters.push({
          key: "approvalStatus",
          label: "Trạng thái duyệt",
          type: "select",
          options: ["PENDING", "SUBMITTED", "APPROVED", "REJECTED"].map((value) => ({ value, label: value })),
        });
      }
      break;
    case "accounts":
      filters.push({ key: "diocese.id", label: "Giáo phận", type: "select", optionsEndpoint: "/dioceses", optionValue: "id", optionLabel: "name" });
      filters.push({ key: "deanery.id", label: "Giáo hạt", type: "select", optionsEndpoint: "/deaneries", optionValue: "id", optionLabel: "name" });
      filters.push({ key: "parish.id", label: "Giáo xứ", type: "select", optionsEndpoint: "/parishes", optionValue: "id", optionLabel: "name" });
      break;
    case "roles":
      filters.push({ key: "roleCode", label: "Mã vai trò", type: "text", placeholder: "Lọc theo mã vai trò" });
      break;
    case "permissions":
      filters.push({ key: "module.moduleCode", label: "Module", type: "text", placeholder: "Lọc theo module" });
      filters.push({ key: "resource.resourceCode", label: "Resource", type: "text", placeholder: "Lọc theo resource" });
      filters.push({ key: "action.actionCode", label: "Action", type: "text", placeholder: "Lọc theo action" });
      filters.push({ key: "scope.scopeCode", label: "Scope", type: "text", placeholder: "Lọc theo scope" });
      break;
    case "account-roles":
      filters.push({ key: "role.roleCode", label: "Vai trò", type: "text", placeholder: "Lọc theo mã vai trò" });
      filters.push({
        key: "isPrimary",
        label: "Vai trò chính",
        type: "boolean",
        options: [
          { value: "true", label: "Chính" },
          { value: "false", label: "Phụ" },
        ],
      });
      break;
    case "role-permissions":
      filters.push({ key: "role.roleCode", label: "Vai trò", type: "text", placeholder: "Lọc theo vai trò" });
      filters.push({
        key: "effect",
        label: "Hiệu lực",
        type: "select",
        options: ["ALLOW", "DENY"].map((value) => ({ value, label: value })),
      });
      break;
    case "account-permissions":
      filters.push({ key: "account.username", label: "Tài khoản", type: "text", placeholder: "Lọc theo tài khoản" });
      filters.push({
        key: "effect",
        label: "Hiệu lực",
        type: "select",
        options: ["ALLOW", "DENY"].map((value) => ({ value, label: value })),
      });
      break;
    case "notifications":
      filters.push({ key: "eventType", label: "Loại thông báo", type: "text", placeholder: "Lọc theo event type" });
      break;
    case "audit-logs":
      filters.push({ key: "username", label: "Người thực hiện", type: "text", placeholder: "Lọc theo tài khoản" });
      filters.push({ key: "action", label: "Hành động", type: "text", placeholder: "Lọc theo action" });
      filters.push({ key: "resourceType", label: "Đối tượng", type: "text", placeholder: "Lọc theo resource" });
      filters.push({
        key: "unitType",
        label: "Cấp đơn vị",
        type: "select",
        options: ["DIOCESE", "DEANERY", "PARISH"].map((value) => ({ value, label: value })),
      });
      break;
    default:
      break;
  }

  return filters;
}
