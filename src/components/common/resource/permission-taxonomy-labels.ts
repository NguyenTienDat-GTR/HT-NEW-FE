export type PermissionTaxonomyKind = "module" | "resource" | "action" | "scope";

const taxonomyLabels: Record<PermissionTaxonomyKind, Record<string, string>> = {
  module: {
    analytics: "Phân tích",
    auth: "Xác thực",
    organization: "Tổ chức",
    system: "Hệ thống",
    training: "Huấn luyện",
  },
  resource: {
    account: "Tài khoản",
    account_permission: "Quyền riêng tài khoản",
    account_role: "Vai trò tài khoản",
    audit_log: "Nhật ký hệ thống",
    certificate: "Chứng nhận",
    course: "Khóa huấn luyện",
    dashboard: "Dashboard phân tích",
    deanery: "Giáo hạt",
    diocese: "Giáo phận",
    executive_board_assignment: "Phân công ban điều hành",
    leader: "Huynh trưởng",
    notification: "Thông báo",
    parish: "Giáo xứ",
    participation: "Tham dự khóa",
    permission: "Quyền hạn",
    position: "Chức vụ",
    requirement: "Điều kiện khóa",
    role: "Vai trò",
    role_permission: "Phân quyền vai trò",
    score_component: "Thành phần điểm",
    score_formula: "Công thức điểm",
    session: "Phiên đăng nhập",
  },
  action: {
    approve: "Duyệt",
    assign: "Gán",
    create: "Tạo",
    delete: "Xóa",
    export: "Xuất dữ liệu",
    manage: "Quản lý",
    read: "Xem",
    revoke: "Thu hồi",
    score: "Chấm điểm",
    submit: "Gửi",
    toggle: "Đổi trạng thái",
    update: "Cập nhật",
  },
  scope: {
    all: "Toàn hệ thống",
    deanery: "Giáo hạt hiện tại",
    diocese: "Giáo phận hiện tại",
    own: "Dữ liệu sở hữu",
    parish: "Giáo xứ hiện tại",
  },
};

export function permissionTaxonomyKindFromColumn(column: string): PermissionTaxonomyKind | undefined {
  switch (column) {
    case "moduleCode":
      return "module";
    case "resourceCode":
      return "resource";
    case "actionCode":
      return "action";
    case "scopeCode":
      return "scope";
    default:
      return undefined;
  }
}

export function permissionTaxonomyKindFromFilter(key: string, collection?: string): PermissionTaxonomyKind | undefined {
  switch (collection) {
    case "modules":
      return "module";
    case "resources":
      return "resource";
    case "actions":
      return "action";
    case "scopes":
      return "scope";
    default:
      break;
  }

  if (key.endsWith("moduleCode")) return "module";
  if (key.endsWith("resourceCode")) return "resource";
  if (key.endsWith("actionCode")) return "action";
  if (key.endsWith("scopeCode")) return "scope";
  return undefined;
}

export function formatPermissionTaxonomyValue(kind: PermissionTaxonomyKind | undefined, value: unknown) {
  if (typeof value !== "string" || !kind) return undefined;
  return taxonomyLabels[kind][value] ?? taxonomyLabels[kind][value.toLowerCase()] ?? value;
}
