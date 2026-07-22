import { compactPayload, enumOptions, type ResourceFormSpec } from "@/components/form/resource-form/types";
import { isSuperAdmin } from "@/lib/auth/permissions";

const effectOptions = enumOptions(["ALLOW", "DENY"]);
const systemAdminRoleCodes = ["SUPER_ADMIN", "ADMIN_DIOCESE", "ADMIN_DEANERY", "ADMIN_PARISH"];
const superAdminAccountRoleOptions = [
  { value: "SUPER_ADMIN", label: "Super admin" },
  { value: "ADMIN_DIOCESE", label: "Admin giáo phận" },
];

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
        options: superAdminAccountRoleOptions,
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
        requiredWhen: (values) => values.roleCode === "SUPER_ADMIN" || values.roleCode === "ADMIN_DIOCESE",
        section: "Thông tin tài khoản",
      },
    ],
    mapSubmit: (values) => {
      const payload = compactPayload(values);
      if (payload.roleCode === "SUPER_ADMIN") {
        delete payload.leaderId;
        delete payload.dioceseId;
      }
      return payload;
    },
  },
  {
    kind: "accounts",
    createTitle: "Tạo tài khoản",
    description: "Chọn huynh trưởng liên kết, các vai trò được gán và một vai trò chính.",
    fields: [
      {
        name: "leaderId",
        label: "Huynh trưởng liên kết",
        type: "select",
        optionsEndpoint: "/leaders/account-candidates",
        optionValue: "id",
        optionLabel: "fullName",
        optionLabelFields: ["fullName", "parishName"],
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
        excludeOptionValuesWhen: (user) => (isSuperAdmin(user) ? [] : systemAdminRoleCodes),
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
    createTitle: "Gán nhiều quyền cho vai trò",
    description: "Chọn vai trò, effect và danh sách quyền bằng checkbox để thao tác nhanh.",
    buildEndpoint: () => "/system/role-permissions/bulk",
    getInitialValues: () => ({ effect: "ALLOW", assignedAt: currentDatetimeLocal() }),
    fields: [
      {
        name: "roleCode",
        label: "Vai trò",
        type: "select",
        required: true,
        optionsEndpoint: "/system/roles",
        optionValue: "roleCode",
        optionLabel: "roleName",
        excludeOptionValuesWhen: (user) => (isSuperAdmin(user) ? [] : systemAdminRoleCodes),
        readOnlyOnEdit: true,
        section: "Thiết lập",
      },
      { name: "effect", label: "Effect", type: "radio", required: true, options: effectOptions, section: "Thiết lập" },
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
      { name: "conditions", label: "Điều kiện metadata", type: "textarea", clearable: true, section: "Điều kiện" },
      { name: "assignedAt", label: "Ngày gán", type: "datetime", section: "Thời hạn" },
      { name: "expiresAt", label: "Ngày hết hạn", type: "datetime", clearable: true, section: "Thời hạn" },
    ],
    mapSubmit: (values) => compactPayload(values),
  },
  {
    kind: "role-permissions",
    actionType: "edit",
    createTitle: "Gán quyền cho vai trò",
    editTitle: "Chỉnh sửa quyền của vai trò",
    description: "Tách rõ ALLOW/DENY và thời hạn hiệu lực của quyền theo vai trò.",
    fields: [
      { name: "roleCode", label: "Vai trò", type: "select", required: true, optionsEndpoint: "/system/roles", optionValue: "roleCode", optionLabel: "roleName", readOnlyOnEdit: true, section: "Liên kết" },
      { name: "permissionCode", label: "Quyền", type: "select", required: true, optionsEndpoint: "/system/permissions", optionValue: "permissionCode", optionLabel: "permissionName", readOnlyOnEdit: true, section: "Liên kết" },
      { name: "effect", label: "Effect", type: "radio", required: true, options: effectOptions, section: "Hiệu lực" },
      { name: "conditions", label: "Điều kiện metadata", type: "textarea", clearable: true, section: "Hiệu lực" },
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
    createTitle: "Thêm nhiều quyền riêng tài khoản",
    description: "Chọn tài khoản hợp lệ, effect và danh sách quyền bằng checkbox.",
    buildEndpoint: () => "/system/account-permissions/bulk",
    getInitialValues: () => ({ effect: "ALLOW" }),
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
        placeholder: "Nhập username để tìm nhanh",
        readOnlyOnEdit: true,
        section: "Thiết lập",
      },
      { name: "effect", label: "Effect", type: "radio", required: true, options: effectOptions, section: "Thiết lập" },
      {
        name: "permissionCodes",
        label: "Danh sách quyền chưa gán",
        type: "checkbox-list",
        required: true,
        buildOptionsEndpoint: (values) => buildTargetOptionsEndpoint("/system/account-permissions/assignable-permissions", "username", values.username),
        optionValue: "permissionCode",
        optionLabel: "permissionName",
        readOnlyOnEdit: true,
        helper: "Chọn tài khoản trước để chỉ hiển thị các quyền riêng chưa được gán cho account này.",
        section: "Quyền chưa gán",
      },
      { name: "reason", label: "Lý do", required: true, type: "textarea", section: "Lý do" },
      { name: "expiresAt", label: "Ngày hết hạn", type: "datetime", clearable: true, section: "Thời hạn" },
    ],
    mapSubmit: (values) => compactPayload(values),
  },
  {
    kind: "account-permissions",
    actionType: "edit",
    editTitle: "Chỉnh sửa quyền riêng tài khoản",
    description: "Override trực tiếp theo account, DENY ưu tiên ALLOW khi tính hiệu lực.",
    fields: [
      { name: "username", label: "Tài khoản", type: "select", required: true, optionsEndpoint: "/system/accounts", optionValue: "username", optionLabel: "username", readOnlyOnEdit: true, section: "Liên kết" },
      { name: "permissionCode", label: "Quyền", type: "select", required: true, optionsEndpoint: "/system/permissions", optionValue: "permissionCode", optionLabel: "permissionName", readOnlyOnEdit: true, section: "Liên kết" },
      { name: "effect", label: "Effect", type: "radio", required: true, options: effectOptions, section: "Hiệu lực" },
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
