import { compactPayload, type ResourceFormSpec } from "@/components/form/resource-form/types";
import { hasRole, isSuperAdmin } from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/auth-store";
import { withFilters } from "@/lib/api/filters";

const systemAdminRoleCodes = ["SUPER_ADMIN", "ADMIN_DIOCESE", "ADMIN_DEANERY", "ADMIN_PARISH"];
// SUPER_ADMIN chỉ cấp tài khoản cho vai trò toàn hệ thống: không cấp cho admin giáo hạt / giáo xứ.
// /system/roles của SUPER_ADMIN đã loại vai trò do các giáo phận tạo, nên chỉ cần loại thêm hai vai trò hệ thống này.
const superAdminAccountExcludedRoleCodes = ["ADMIN_DEANERY", "ADMIN_PARISH"];

// Phạm vi của người đang tạo tài khoản: giáo phận chọn được giáo hạt + giáo xứ, giáo hạt chỉ chọn giáo xứ, giáo xứ không cần chọn.
function canPickDeanery(user: AuthUser | null | undefined) {
  return hasRole(user, "ADMIN_DIOCESE");
}

function canPickParish(user: AuthUser | null | undefined) {
  return hasRole(user, "ADMIN_DIOCESE") || hasRole(user, "ADMIN_DEANERY");
}

function candidateEndpoint(values: Record<string, unknown>) {
  const filters: Record<string, unknown> = {};
  if (values.accountParishFilter) filters["parish.id"] = values.accountParishFilter;
  else if (values.accountDeaneryFilter) filters["parish.deanery.id"] = values.accountDeaneryFilter;
  const path = "/leaders/account-candidates";
  return Object.keys(filters).length ? withFilters(path, filters) : path;
}

export function getAccountCreateExcludedRoleCodes(user: AuthUser | null) {
  if (isSuperAdmin(user)) return [];
  if (hasRole(user, "ADMIN_DIOCESE")) return ["SUPER_ADMIN", "ADMIN_DIOCESE"];
  if (hasRole(user, "ADMIN_DEANERY")) return ["SUPER_ADMIN", "ADMIN_DIOCESE", "ADMIN_DEANERY"];
  return systemAdminRoleCodes;
}

export const systemFormSpecs: ResourceFormSpec[] = [
  {
    kind: "accounts",
    actionType: "create",
    superAdminOnly: true,
    createTitle: "Tạo tài khoản",
    description: "Chọn vai trò, phạm vi quản lý và email nhận thông tin đăng nhập.",
    fields: [
      {
        name: "roleCode",
        label: "Vai trò",
        type: "select",
        required: true,
        optionsEndpoint: "/system/roles",
        optionValue: "roleCode",
        optionLabel: "roleName",
        excludeOptionValues: superAdminAccountExcludedRoleCodes,
        createOnly: true,
        section: "Thông tin tài khoản",
      },
      {
        name: "dioceseId",
        label: "Giáo phận trực thuộc",
        type: "select",
        optionsEndpoint: "/dioceses",
        optionValue: "id",
        optionLabel: "name",
        clearable: true,
        visibleWhen: (values) => values.roleCode === "ADMIN_DIOCESE",
        requiredWhen: (values) => values.roleCode === "ADMIN_DIOCESE",
        section: "Thông tin tài khoản",
      },
      {
        name: "credentialEmail",
        label: "Email nhận thông tin đăng nhập",
        type: "email",
        createOnly: true,
        helper: "Có thể trùng với email của tài khoản khác. Tên đăng nhập được sinh từ phần trước @.",
        requiredWhen: (values) => Boolean(values.roleCode),
        section: "Thông tin tài khoản",
      },
    ],
    mapSubmit: (values) => {
      const payload = compactPayload(values);
      // Chỉ ADMIN_DIOCESE gắn giáo phận; mọi vai trò khác do SUPER_ADMIN cấp đều không gắn Huynh Trưởng hay đơn vị.
      delete payload.leaderId;
      if (payload.roleCode !== "ADMIN_DIOCESE") delete payload.dioceseId;
      return payload;
    },
  },
  {
    kind: "accounts",
    createTitle: "Tạo tài khoản",
    description: "Chọn huynh trưởng liên kết, các vai trò được gán và một vai trò chính.",
    getInitialValues: (user) => ({
      ...(user?.deaneryId && !canPickDeanery(user) ? { accountDeaneryFilter: user.deaneryId } : {}),
    }),
    fields: [
      {
        name: "accountDeaneryFilter",
        label: "Giáo hạt",
        helper: "Chọn để thu hẹp danh sách huynh trưởng.",
        type: "select",
        optionsEndpoint: "/deaneries",
        optionValue: "id",
        optionLabel: "name",
        clearable: true,
        visibleWhen: (_values, _mode, user) => canPickDeanery(user),
        section: "Thông tin tài khoản",
      },
      {
        name: "accountParishFilter",
        label: "Giáo xứ",
        helper: "Chọn để thu hẹp danh sách huynh trưởng.",
        type: "select",
        optionsEndpoint: "/parishes",
        buildOptionsEndpoint: (values) =>
          values.accountDeaneryFilter ? withFilters("/parishes", { "deanery.id": values.accountDeaneryFilter }) : undefined,
        optionValue: "id",
        optionLabel: "name",
        clearable: true,
        visibleWhen: (_values, _mode, user) => canPickParish(user),
        section: "Thông tin tài khoản",
      },
      {
        name: "leaderId",
        label: "Huynh trưởng liên kết",
        helper: "Gõ tên thánh, họ tên, email hoặc số điện thoại để tìm.",
        type: "select",
        optionsEndpoint: "/leaders/account-candidates",
        buildOptionsEndpoint: candidateEndpoint,
        optionSearchParam: "search",
        serverFiltered: true,
        optionValue: "id",
        optionLabel: "fullName",
        optionLabelFields: ["holyName", "fullName", "parishName"],
        searchable: true,
        required: true,
        section: "Thông tin tài khoản",
      },
      {
        name: "roleCodes",
        label: "Vai trò",
        type: "checkbox-list",
        required: true,
        optionsEndpoint: "/system/roles",
        optionValue: "roleCode",
        optionLabel: "roleName",
        excludeOptionValuesWhen: getAccountCreateExcludedRoleCodes,
        primaryFieldName: "primaryRoleCode",
        primaryLabel: "Chính",
        createOnly: true,
        helper: "Tick vai trò cần gán rồi chọn radio Chính trên một vai trò đã tick.",
        section: "Thông tin tài khoản",
      },
    ],
    mapSubmit: (values) => {
      const payload = compactPayload(values);
      const roleCodes = Array.isArray(values.roleCodes) ? values.roleCodes.map(String).filter(Boolean) : [];
      if (roleCodes.length) {
        payload.roleCodes = roleCodes;
        payload.primaryRoleCode = roleCodes.includes(String(values.primaryRoleCode ?? "")) ? values.primaryRoleCode : roleCodes[0];
      }
      delete payload.roleCode;
      delete payload.dioceseId;
      delete payload.credentialEmail;
      // Giáo hạt / giáo xứ chỉ để lọc danh sách huynh trưởng.
      delete payload.accountDeaneryFilter;
      delete payload.accountParishFilter;
      return payload;
    },
  },
  {
    kind: "roles",
    createTitle: "Thêm vai trò",
    editTitle: "Chỉnh sửa vai trò",
    description: "Vai trò nghiệp vụ và thứ tự hiển thị.",
    fields: [
      { name: "roleCode", label: "Mã vai trò", required: true, readOnlyOnEdit: true, section: "Thông tin vai trò" },
      { name: "roleName", label: "Tên vai trò", required: true, section: "Thông tin vai trò" },
      { name: "description", label: "Mô tả", type: "textarea", clearable: true, section: "Thông tin vai trò" },
      { name: "displayOrder", label: "Thứ tự hiển thị", type: "number", section: "Hiển thị" },
    ],
    mapSubmit: (values) => {
      const payload = compactPayload(values);
      delete payload.roleCode;
      return payload;
    },
  },
  {
    kind: "permissions",
    actionType: "edit",
    editTitle: "Chỉnh sửa quyền",
    description: "Permission code sinh từ module/resource/action/scope, chỉ SUPER_ADMIN được ghi.",
    fields: [
      { name: "permissionName", label: "Tên quyền", required: true, section: "Thông tin quyền" },
      { name: "moduleCode", label: "Module", required: true, readOnlyOnEdit: true, section: "Taxonomy" },
      { name: "resourceCode", label: "Resource", required: true, readOnlyOnEdit: true, section: "Taxonomy" },
      { name: "actionCode", label: "Action", required: true, readOnlyOnEdit: true, section: "Taxonomy" },
      { name: "scopeCode", label: "Scope", required: true, readOnlyOnEdit: true, section: "Taxonomy" },
      { name: "description", label: "Mô tả", type: "textarea", clearable: true, section: "Hiển thị" },
      { name: "displayOrder", label: "Thứ tự", type: "number", section: "Hiển thị" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") {
        delete payload.moduleCode;
        delete payload.resourceCode;
        delete payload.actionCode;
        delete payload.scopeCode;
      }
      return payload;
    },
  },
  {
    kind: "account-roles",
    actionType: "create",
    createTitle: "Gán nhiều vai trò cho tài khoản",
    description: "Chọn account trong phạm vi quản lý và tick nhiều vai trò trong một lần gửi.",
    buildEndpoint: () => "/system/account-roles/bulk",
    getInitialValues: () => ({ assignedAt: currentDatetimeLocal() }),
    fields: [
      { name: "username", label: "Tài khoản", type: "select", required: true, optionsEndpoint: "/system/accounts", optionValue: "username", optionLabel: "username", readOnlyOnEdit: true, section: "Thiết lập" },
      {
        name: "roleCodes",
        label: "Danh sách vai trò chưa gán",
        type: "checkbox-list",
        required: true,
        buildOptionsEndpoint: (values) => buildTargetOptionsEndpoint("/system/account-roles/assignable-roles", "username", values.username),
        optionValue: "roleCode",
        optionLabel: "roleName",
        readOnlyOnEdit: true,
        helper: "Chọn tài khoản trước để tải các vai trò chưa được gán cho account này.",
        section: "Vai trò chưa gán",
      },
      {
        name: "primaryRoleCode",
        label: "Vai trò chính",
        type: "select",
        buildOptionsEndpoint: (values) => buildTargetOptionsEndpoint("/system/account-roles/assignable-roles", "username", values.username),
        optionValue: "roleCode",
        optionLabel: "roleName",
        helper: "Nếu chọn, vai trò này phải nằm trong danh sách vai trò đã tick.",
        section: "Thiết lập",
      },
      { name: "assignedAt", label: "Ngày gán", type: "datetime", section: "Thời hạn" },
      { name: "expiresAt", label: "Ngày hết hạn", type: "datetime", clearable: true, section: "Thời hạn" },
    ],
    mapSubmit: (values) => compactPayload(values),
  },
  {
    kind: "account-roles",
    actionType: "edit",
    editTitle: "Chỉnh sửa gán vai trò",
    description: "Gán role cho account, quản lý primary role và thời hạn.",
    fields: [
      { name: "username", label: "Tài khoản", type: "select", required: true, optionsEndpoint: "/system/accounts", optionValue: "username", optionLabel: "username", readOnlyOnEdit: true, section: "Liên kết" },
      { name: "roleCode", label: "Vai trò", type: "select", required: true, optionsEndpoint: "/system/roles", optionValue: "roleCode", optionLabel: "roleName", readOnlyOnEdit: true, section: "Liên kết" },
      { name: "isPrimary", label: "Vai trò chính", type: "switch", section: "Hiệu lực" },
      { name: "assignedAt", label: "Ngày gán", type: "datetime", section: "Hiệu lực" },
      { name: "expiresAt", label: "Ngày hết hạn", type: "datetime", clearable: true, section: "Hiệu lực" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (payload.isPrimary === "true") payload.isPrimary = true;
      if (payload.isPrimary === "false") payload.isPrimary = false;
      if (mode === "edit") {
        delete payload.username;
        delete payload.roleCode;
      }
      return payload;
    },
  },
  {
    kind: "role-permissions",
    actionType: "create",
    createTitle: "Phân quyền cho vai trò",
    description: "Chọn vai trò và tick các quyền cần phân. Quyền phân ra luôn ở trạng thái cho phép.",
    buildEndpoint: () => "/system/role-permissions/bulk",
    getInitialValues: () => ({ assignedAt: currentDatetimeLocal() }),
    fields: [
      {
        name: "roleCode",
        label: "Vai trò",
        type: "select",
        required: true,
        // BE đã lọc vai trò cấp cao hơn người dùng và vai trò ngoài phân cấp (giáo phận → admin giáo hạt/giáo xứ, giáo hạt → admin giáo xứ).
        optionsEndpoint: "/system/role-permissions/manageable-roles?action=assign",
        optionValue: "roleCode",
        optionLabel: "roleName",
        readOnlyOnEdit: true,
        section: "Thiết lập",
      },
      {
        name: "permissionCodes",
        label: "Danh sách quyền chưa gán",
        type: "checkbox-list",
        required: true,
        buildOptionsEndpoint: (values) => buildTargetOptionsEndpoint("/system/role-permissions/assignable-permissions", "roleCode", values.roleCode),
        optionValue: "permissionCode",
        optionLabel: "permissionName",
        readOnlyOnEdit: true,
        helper: "Chọn vai trò trước để chỉ hiển thị các quyền chưa được gán cho vai trò này.",
        section: "Quyền chưa gán",
      },
      { name: "assignedAt", label: "Ngày gán", type: "datetime", section: "Thời hạn" },
      { name: "expiresAt", label: "Ngày hết hạn", type: "datetime", clearable: true, section: "Thời hạn" },
    ],
    mapSubmit: (values) => compactPayload(values),
  },
  {
    kind: "role-permissions",
    actionType: "revoke",
    createTitle: "Thu hồi quyền của vai trò",
    description: "Chọn vai trò và tick các quyền cần thu hồi. Quyền bị gỡ khỏi vai trò và có thể phân lại sau.",
    submitLabel: "Thu hồi quyền",
    buildEndpoint: () => "/system/role-permissions/revoke",
    fields: [
      {
        name: "roleCode",
        label: "Vai trò",
        type: "select",
        required: true,
        optionsEndpoint: "/system/role-permissions/manageable-roles?action=revoke",
        optionValue: "roleCode",
        optionLabel: "roleName",
        section: "Thiết lập",
      },
      {
        name: "permissionCodes",
        label: "Danh sách quyền đã phân",
        type: "checkbox-list",
        required: true,
        buildOptionsEndpoint: (values) => buildTargetOptionsEndpoint("/system/role-permissions/revocable-permissions", "roleCode", values.roleCode),
        optionValue: "permissionCode",
        optionLabel: "permissionName",
        helper: "Chọn vai trò trước để hiển thị các quyền đã phân mà bạn được phép thu hồi.",
        section: "Quyền đã phân",
      },
    ],
    mapSubmit: (values) => compactPayload(values),
  },
  {
    kind: "role-permissions",
    actionType: "edit",
    createTitle: "Phân quyền cho vai trò",
    editTitle: "Chỉnh sửa quyền của vai trò",
    description: "Điều chỉnh thời hạn của quyền đã phân cho vai trò.",
    fields: [
      { name: "roleCode", label: "Vai trò", type: "select", required: true, optionsEndpoint: "/system/roles", optionValue: "roleCode", optionLabel: "roleName", readOnlyOnEdit: true, section: "Liên kết" },
      { name: "permissionCode", label: "Quyền", type: "select", required: true, optionsEndpoint: "/system/permissions", optionValue: "permissionCode", optionLabel: "permissionName", readOnlyOnEdit: true, section: "Liên kết" },
      { name: "assignedAt", label: "Ngày gán", type: "datetime", section: "Hiệu lực" },
      { name: "expiresAt", label: "Ngày hết hạn", type: "datetime", clearable: true, section: "Hiệu lực" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") {
        delete payload.roleCode;
        delete payload.permissionCode;
      }
      return payload;
    },
  },
  {
    kind: "account-permissions",
    actionType: "create",
    createTitle: "Phân quyền cho tài khoản",
    description: "Chọn tài khoản hợp lệ và tick các quyền cần phân. Quyền phân ra luôn ở trạng thái cho phép.",
    buildEndpoint: () => "/system/account-permissions/bulk",
    fields: [
      {
        name: "username",
        label: "Tài khoản",
        type: "select",
        required: true,
        optionsEndpoint: "/system/accounts/permission-targets",
        optionValue: "username",
        optionLabel: "username",
        optionSearchParam: "search",
        searchable: true,
        wide: true,
        placeholder: "Nhập tên đăng nhập, tên huynh trưởng, vai trò, giáo xứ hoặc giáo hạt để tìm nhanh",
        readOnlyOnEdit: true,
        section: "Thiết lập",
      },
      {
        name: "permissionCodes",
        label: "Danh sách quyền chưa gán",
        type: "checkbox-list",
        required: true,
        buildOptionsEndpoint: (values) => buildTargetOptionsEndpoint("/system/account-permissions/assignable-permissions", "username", values.username),
        optionValue: "permissionCode",
        optionLabel: "permissionName",
        readOnlyOnEdit: true,
        helper: "Chọn tài khoản trước để chỉ hiển thị các quyền chưa được phân cho tài khoản này.",
        section: "Quyền chưa gán",
      },
      { name: "reason", label: "Lý do", required: true, type: "textarea", section: "Lý do" },
      { name: "expiresAt", label: "Ngày hết hạn", type: "datetime", clearable: true, section: "Thời hạn" },
    ],
    mapSubmit: (values) => compactPayload(values),
  },
  {
    kind: "account-permissions",
    actionType: "revoke",
    createTitle: "Thu hồi quyền của tài khoản",
    description: "Chọn tài khoản và tick các quyền cần thu hồi. Quyền bị gỡ khỏi tài khoản và có thể phân lại sau.",
    submitLabel: "Thu hồi quyền",
    buildEndpoint: () => "/system/account-permissions/revoke",
    fields: [
      {
        name: "username",
        label: "Tài khoản",
        type: "select",
        required: true,
        optionsEndpoint: "/system/accounts/permission-targets",
        optionValue: "username",
        optionLabel: "username",
        optionSearchParam: "search",
        searchable: true,
        wide: true,
        placeholder: "Nhập tên đăng nhập, tên huynh trưởng, vai trò, giáo xứ hoặc giáo hạt để tìm nhanh",
        section: "Thiết lập",
      },
      {
        name: "permissionCodes",
        label: "Danh sách quyền đã phân",
        type: "checkbox-list",
        required: true,
        buildOptionsEndpoint: (values) => buildTargetOptionsEndpoint("/system/account-permissions/revocable-permissions", "username", values.username),
        optionValue: "permissionCode",
        optionLabel: "permissionName",
        helper: "Chọn tài khoản trước để hiển thị các quyền đã phân mà bạn được phép thu hồi.",
        section: "Quyền đã phân",
      },
    ],
    mapSubmit: (values) => compactPayload(values),
  },
  {
    kind: "account-permissions",
    actionType: "edit",
    editTitle: "Chỉnh sửa quyền của tài khoản",
    description: "Điều chỉnh lý do và thời hạn của quyền đã phân cho tài khoản.",
    fields: [
      { name: "username", label: "Tài khoản", type: "select", required: true, optionsEndpoint: "/system/accounts", optionValue: "username", optionLabel: "username", readOnlyOnEdit: true, section: "Liên kết" },
      { name: "permissionCode", label: "Quyền", type: "select", required: true, optionsEndpoint: "/system/permissions", optionValue: "permissionCode", optionLabel: "permissionName", readOnlyOnEdit: true, section: "Liên kết" },
      { name: "reason", label: "Lý do", required: true, type: "textarea", section: "Hiệu lực" },
      { name: "expiresAt", label: "Ngày hết hạn", type: "datetime", clearable: true, section: "Hiệu lực" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") {
        delete payload.username;
        delete payload.permissionCode;
      }
      return payload;
    },
  },
];

function buildTargetOptionsEndpoint(basePath: string, key: string, value: unknown) {
  const target = typeof value === "string" ? value.trim() : "";
  if (!target) return undefined;
  return `${basePath}?${key}=${encodeURIComponent(target)}`;
}

function currentDatetimeLocal() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}
