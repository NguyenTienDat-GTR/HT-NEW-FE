import type { Icon } from "@phosphor-icons/react";

export type ResourceKind =
  | "dashboard"
  | "analytics"
  | "notifications"
  | "my-permissions"
  | "dioceses"
  | "deaneries"
  | "parishes"
  | "positions"
  | "executive-board"
  | "leaders"
  | "courses"
  | "course-types"
  | "score-components"
  | "participations"
  | "certificates"
  | "certificate-config"
  | "leader-levels"
  | "accounts"
  | "roles"
  | "permissions"
  | "account-roles"
  | "role-permissions"
  | "account-permissions"
  | "audit-logs";

export type ResourceAction = "view" | "create" | "edit" | "toggle" | "submit" | "approve" | "reject" | "revoke" | "reissue" | "withdraw" | "remove" | "score" | "matrix" | "read";

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
  optionCollection?: string;
  optionValue?: string;
  optionLabel?: string;
  placeholder?: string;
  // Bộ lọc phụ thuộc: danh sách lựa chọn chỉ gồm bản ghi thuộc giá trị đang chọn của bộ lọc cha
  // (ví dụ giáo xứ theo giáo hạt). optionFilterField là trường lọc của API danh sách lựa chọn.
  dependsOn?: { filterKey: string; optionFilterField: string };
};

// Bộ lọc đơn vị tổ chức dùng chung: giáo phận -> giáo hạt -> giáo xứ, mỗi cấp chỉ hiện đơn vị thuộc cấp cha đang chọn.
export function deaneryUnitFilter(key: string, parentFilterKey?: string): RouteFilterConfig {
  return {
    key,
    label: "Giáo hạt",
    type: "select",
    optionsEndpoint: "/deaneries",
    optionValue: "id",
    optionLabel: "name",
    ...(parentFilterKey ? { dependsOn: { filterKey: parentFilterKey, optionFilterField: "diocese.id" } } : {}),
  };
}

export function parishUnitFilter(key: string, parentFilterKey?: string, parentIsDiocese = false): RouteFilterConfig {
  return {
    key,
    label: "Giáo xứ",
    type: "select",
    optionsEndpoint: "/parishes",
    optionValue: "id",
    optionLabel: "name",
    ...(parentFilterKey ? { dependsOn: { filterKey: parentFilterKey, optionFilterField: parentIsDiocese ? "deanery.diocese.id" : "deanery.id" } } : {}),
  };
}

const statusFilterOptions: RouteFilterOption[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Tạm ngưng" },
];

const unitTypeFilterLabels: Record<string, string> = {
  DIOCESE: "Giáo phận",
  DEANERY: "Giáo hạt",
  PARISH: "Giáo xứ",
};

function unitTypeFilterOptions(values: string[]): RouteFilterOption[] {
  return values.map((value) => ({ value, label: unitTypeFilterLabels[value] ?? value }));
}

const participationStatusLabels: Record<string, string> = {
  REGISTERED: "Đã đăng ký",
  ATTENDED: "Đã tham dự",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  REJECTED: "Từ chối",
};

const approvalStatusLabels: Record<string, string> = {
  PENDING: "Chờ xử lý",
  SUBMITTED: "Đã gửi",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  REVOKED: "Đã thu hồi",
  NOT_REQUIRED: "Không yêu cầu",
};

function labeledOptions(values: string[], labels: Record<string, string>): RouteFilterOption[] {
  return values.map((value) => ({ value, label: labels[value] ?? value }));
}

export type RouteConfig = {
  path: string;
  createPath?: string;
  detailPath?: string;
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
  // Bộ lọc nền luôn áp dụng cho danh sách (giá trị là tập cho phép), người dùng không đổi được.
  baseFilters?: Record<string, string[]>;
  // Cột hiển thị -> thuộc tính entity dùng để sắp xếp (có thể ghép nhiều trường bằng dấu +, ví dụ firstName+lastName).
  // Giá trị null = cột tính ra ở response nên không sắp xếp được. Cột không khai báo dùng chính tên cột.
  sortFields?: Record<string, string | null>;
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
  // Giáo phận / giáo hạt / giáo xứ: nút bật/tắt chỉ phụ thuộc quyền toggle, không còn lệ thuộc quyền chỉnh sửa.
  const organizationUnitKind = config.kind === "dioceses" || config.kind === "deaneries" || config.kind === "parishes";
  // Phân quyền vai trò / tài khoản không có bật/tắt: chỉ phân quyền và thu hồi.
  const permissionAssignmentKind = config.kind === "role-permissions" || config.kind === "account-permissions";
  const togglePermissionPrefixes = permissionAssignmentKind ? undefined : config.actionPermissionPrefixes?.filter(
    (prefix) =>
      prefix.includes(".toggle.") ||
      (!organizationUnitKind && (
      prefix.includes(".update.") ||
      prefix.includes(".manage.") ||
      prefix.includes(".assign.") ||
      // Thu hồi chứng nhận là hành động riêng, không phải bật/tắt trạng thái.
      (prefix.includes(".revoke.") && config.kind !== "certificates"))),
  );
  const revokePermissionPrefixes =
    config.kind === "certificates" ? config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".revoke.")) : undefined;
  const reissuePermissionPrefixes =
    config.kind === "certificates" ? config.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".reissue.")) : undefined;
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
      ...(approvePermissionPrefixes?.length ? { approve: { label: "Duyệt", permissionPrefixes: approvePermissionPrefixes } } : {}),
      // Tài khoản có quyền duyệt hồ sơ tham dự cũng có quyền từ chối duyệt.
      ...(approvePermissionPrefixes?.length && config.kind === "participations"
        ? { reject: { label: "Từ chối", permissionPrefixes: approvePermissionPrefixes } }
        : {}),
      ...(revokePermissionPrefixes?.length ? { revoke: { label: "Thu hồi", permissionPrefixes: revokePermissionPrefixes } } : {}),
      ...(reissuePermissionPrefixes?.length ? { reissue: { label: "Cấp lại", permissionPrefixes: reissuePermissionPrefixes } } : {}),
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
      options: statusFilterOptions,
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
      filters.push(deaneryUnitFilter("parish.deanery.id"));
      filters.push(parishUnitFilter("parish.id", "parish.deanery.id"));
      filters.push({
        key: "leaderLevel",
        label: "Cấp HT",
        type: "select",
        optionsEndpoint: "/leader-levels/options",
        optionValue: "levelCode",
        optionLabel: "levelName",
      });
      break;
    case "course-types":
      filters.push({
        key: "managementUnitType",
        label: "Cấp quản lý",
        type: "select",
        options: unitTypeFilterOptions(["DIOCESE", "DEANERY"]),
      });
      break;
    case "courses":
      filters.push({
        key: "courseType.typeCode",
        label: "Loại khóa",
        type: "select",
        optionsEndpoint: "/training/course-types",
        optionValue: "typeCode",
        optionLabel: "typeName",
      });
      filters.push({
        key: "registrationStatus",
        label: "Thời gian đăng ký",
        type: "select",
        options: [
          { value: "OPEN", label: "Đang mở đăng ký" },
          { value: "NOT_STARTED", label: "Chưa đến giờ đăng ký" },
          { value: "CLOSED", label: "Đã đóng thủ công" },
          { value: "ENDED", label: "Đã hết hạn đăng ký" },
        ],
      });
      filters.push({
        key: "organizingStatus",
        label: "Thời gian tổ chức",
        type: "select",
        options: [
          { value: "UPCOMING", label: "Sắp diễn ra" },
          { value: "ONGOING", label: "Đang diễn ra" },
          { value: "ENDED", label: "Đã kết thúc" },
        ],
      });
      filters.push({ key: "hostYear", label: "Năm", type: "text", placeholder: "Ví dụ 2026" });
      break;
    case "score-components":
      filters.push({
        key: "courseType.typeCode",
        label: "Loại khóa",
        type: "select",
        optionsEndpoint: "/training/course-types",
        optionValue: "typeCode",
        optionLabel: "typeName",
      });
      filters.push({
        key: "unitType",
        label: "Cấp quản lý",
        type: "select",
        options: unitTypeFilterOptions(["DIOCESE", "DEANERY"]),
      });
      break;
    case "participations":
      filters.push({ key: "course.courseCode", label: "Khóa", type: "text", placeholder: "Lọc theo mã khóa" });
      if (columns.has("participationStatus")) {
        filters.push({
          key: "participationStatus",
          label: "Trạng thái tham dự",
          type: "select",
          options: labeledOptions(["REGISTERED", "ATTENDED", "COMPLETED", "CANCELLED", "REJECTED"], participationStatusLabels),
        });
      }
      if (columns.has("approvalStatus")) {
        filters.push({
          key: "approvalStatus",
          label: "Trạng thái duyệt",
          type: "select",
          options: labeledOptions(["PENDING", "SUBMITTED", "APPROVED", "REJECTED"], approvalStatusLabels),
        });
      }
      if (columns.has("certificateApprovalStatus")) {
        filters.push({
          key: "certificateApprovalStatus",
          label: "Chứng nhận",
          type: "select",
          options: labeledOptions(["PENDING", "SUBMITTED", "APPROVED", "REJECTED", "REVOKED", "NOT_REQUIRED"], approvalStatusLabels),
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
          options: labeledOptions(["PENDING", "SUBMITTED", "APPROVED", "REJECTED", "REVOKED"], approvalStatusLabels),
        });
      }
      break;
    case "accounts":
      filters.push({ key: "diocese.id", label: "Giáo phận", type: "select", optionsEndpoint: "/dioceses", optionValue: "id", optionLabel: "name" });
      filters.push(deaneryUnitFilter("deanery.id", "diocese.id"));
      filters.push(parishUnitFilter("parish.id", "deanery.id"));
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
      break;
    case "account-permissions":
      filters.push({ key: "account.username", label: "Tài khoản", type: "text", placeholder: "Lọc theo tài khoản" });
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
        options: unitTypeFilterOptions(["DIOCESE", "DEANERY", "PARISH"]),
      });
      break;
    default:
      break;
  }

  return filters;
}
