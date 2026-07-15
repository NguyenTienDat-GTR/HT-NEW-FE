import { compactPayload, enumOptions, type ResourceFormSpec } from "../types";

const effectOptions = enumOptions(["ALLOW", "DENY"]);

export const systemFormSpecs: ResourceFormSpec[] = [
  {
    kind: "accounts",
    createTitle: "Thêm tài khoản",
    editTitle: "Chỉnh sửa tài khoản",
    description: "Tài khoản hệ thống với scope theo vai trò và hồ sơ liên kết.",
    fields: [
      {
        name: "roleCode",
        label: "Vai trò",
        type: "select",
        required: true,
        optionsEndpoint: "/system/roles",
        optionValue: "roleCode",
        optionLabel: "roleName",
        readOnlyOnEdit: true,
        section: "Vai trò & phạm vi",
      },
      {
        name: "leaderId",
        label: "Huynh trưởng liên kết",
        type: "select",
        optionsEndpoint: "/leaders",
        optionValue: "id",
        optionLabel: "fullName",
        clearable: true,
        section: "Vai trò & phạm vi",
      },
      {
        name: "dioceseId",
        label: "Giáo phận trực thuộc",
        type: "select",
        optionsEndpoint: "/dioceses",
        optionValue: "id",
        optionLabel: "name",
        clearable: true,
        section: "Vai trò & phạm vi",
      },
      { name: "credentialEmail", label: "Email nhận thông tin đăng nhập", type: "email", createOnly: true, section: "Thông tin gửi thông báo" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") {
        delete payload.roleCode;
        delete payload.credentialEmail;
      }
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
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") delete payload.roleCode;
      return payload;
    },
  },
  {
    kind: "permissions",
    createTitle: "Thêm quyền",
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
    createTitle: "Gán vai trò tài khoản",
    editTitle: "Chỉnh sửa gán vai trò",
    description: "Gán role cho account, quản lý primary role và thời hạn.",
    fields: [
      {
        name: "username",
        label: "Tài khoản",
        type: "select",
        required: true,
        optionsEndpoint: "/system/accounts",
        optionValue: "username",
        optionLabel: "username",
        readOnlyOnEdit: true,
        section: "Liên kết",
      },
      {
        name: "roleCode",
        label: "Vai trò",
        type: "select",
        required: true,
        optionsEndpoint: "/system/roles",
        optionValue: "roleCode",
        optionLabel: "roleName",
        readOnlyOnEdit: true,
        section: "Liên kết",
      },
      { name: "isPrimary", label: "Vai trò chính", type: "select", options: enumOptions(["true", "false"]), section: "Hiệu lực" },
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
    createTitle: "Gán quyền cho vai trò",
    editTitle: "Chỉnh sửa quyền của vai trò",
    description: "Tách rõ ALLOW/DENY và thời hạn hiệu lực của quyền theo vai trò.",
    fields: [
      {
        name: "roleCode",
        label: "Vai trò",
        type: "select",
        required: true,
        optionsEndpoint: "/system/roles",
        optionValue: "roleCode",
        optionLabel: "roleName",
        readOnlyOnEdit: true,
        section: "Liên kết",
      },
      {
        name: "permissionCode",
        label: "Quyền",
        type: "select",
        required: true,
        optionsEndpoint: "/system/permissions",
        optionValue: "permissionCode",
        optionLabel: "permissionName",
        readOnlyOnEdit: true,
        section: "Liên kết",
      },
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
    createTitle: "Thêm quyền riêng tài khoản",
    editTitle: "Chỉnh sửa quyền riêng tài khoản",
    description: "Override trực tiếp theo account, DENY ưu tiên ALLOW khi tính hiệu lực.",
    fields: [
      {
        name: "username",
        label: "Tài khoản",
        type: "select",
        required: true,
        optionsEndpoint: "/system/accounts",
        optionValue: "username",
        optionLabel: "username",
        readOnlyOnEdit: true,
        section: "Liên kết",
      },
      {
        name: "permissionCode",
        label: "Quyền",
        type: "select",
        required: true,
        optionsEndpoint: "/system/permissions",
        optionValue: "permissionCode",
        optionLabel: "permissionName",
        readOnlyOnEdit: true,
        section: "Liên kết",
      },
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
