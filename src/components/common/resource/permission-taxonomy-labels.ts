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
    registration_template: "File xuất danh sách đăng ký",
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
    course_type: "Loại khóa huấn luyện",
    role: "Vai trò",
    role_permission: "Phân quyền vai trò",
    score_component: "Thành phần điểm",
    session: "Phiên đăng nhập",
    // Khóa đối tượng ghi trong nhật ký hệ thống (theo đường dẫn API, có thể ở dạng số nhiều).
    account_roles: "Vai trò tài khoản",
    account_permissions: "Phân quyền tài khoản",
    role_permissions: "Phân quyền vai trò",
    requirement: "Điều kiện khóa huấn luyện",
    badges: "Thẻ tham dự",
    media: "Ảnh và tệp",
    excel_jobs: "Tiến trình Excel",
    executive_board: "Ban điều hành",
    cross_deanery: "Gửi liên giáo hạt",
    course_invitations: "Lời mời khóa huấn luyện",
    search: "Tìm kiếm",
    mobile: "Ứng dụng di động",
  },
  action: {
    approve: "Duyệt",
    assign: "Gán",
    create: "Tạo",
    create_past: "Tạo khóa đã diễn ra",
    delete: "Xóa",
    export: "Xuất dữ liệu",
    finish: "Kết thúc",
    lock: "Khóa/mở",
    manage: "Quản lý",
    manage_site_subdomain: "Quản lý subdomain",
    read: "Xem",
    reissue: "Cấp lại",
    reset_password: "Đặt lại mật khẩu",
    cross_approve: "Đồng ý gửi liên giáo hạt",
    revoke: "Thu hồi",
    scan: "Quét điểm danh",
    score: "Chấm điểm",
    submit: "Gửi",
    toggle: "Đổi trạng thái",
    transfer: "Chuyển đơn vị",
    update: "Cập nhật",
    update_birth_date: "Sửa ngày sinh",
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
