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
    analytics: "Phân tích",
    auth: "Xác thực",
    account_permission: "Phân quyền tài khoản",
    account_role: "Vai trò tài khoản",
    attendance: "Điểm danh khóa huấn luyện",
    audit_log: "Nhật ký hệ thống",
    badge_config: "Cấu hình thẻ tham dự",
    certificate: "Chứng nhận",
    certificate_config: "Cấu hình chứng nhận",
    leader_level: "Cấp độ huynh trưởng",
    course: "Khóa huấn luyện",
    dashboard: "Dashboard phân tích",
    deanery: "Giáo hạt",
    diocese: "Giáo phận",
    executive_board_assignment: "Phân công ban điều hành",
    leader: "Huynh trưởng",
    leader_certificate: "Chứng nhận trong hồ sơ huynh trưởng",
    notification: "Thông báo",
    parish: "Giáo xứ",
    participation: "Tham dự khóa",
    permission: "Quyền hạn",
    position: "Chức vụ",
    requirement: "Điều kiện khóa",
    course_type: "Loại khóa huấn luyện",
    role: "Vai trò",
    role_permission: "Phân quyền vai trò",
    score_component: "Thành phần điểm",
    session: "Phiên đăng nhập",
  },
  action: {
    approve: "Duyệt",
    assign: "Gán",
    create: "Tạo",
    delete: "Xóa",
    export: "Xuất dữ liệu",
    finish: "Kết thúc",
    lock: "Khóa/mở",
    manage: "Quản lý",
    read: "Xem",
    reset_password: "Đặt lại mật khẩu",
    cross_approve: "Đồng ý gửi liên giáo hạt",
    revoke: "Thu hồi",
    scan: "Quét điểm danh",
    score: "Chấm điểm",
    submit: "Gửi",
    toggle: "Đổi trạng thái",
    update: "Cập nhật",
  },
  scope: {
    all: "Toàn hệ thống",
    deanery: "Giáo hạt",
    diocese: "Giáo phận",
    own: "Dữ liệu sở hữu",
    parish: "Giáo xứ",
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
