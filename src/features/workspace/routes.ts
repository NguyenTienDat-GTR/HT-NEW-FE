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
  moduleName: string;
  title: string;
  subtitle: string;
  endpoint?: string;
  permissionPrefixes: string[];
  actionPermissionPrefixes?: string[];
  kind: ResourceKind;
  icon: typeof SquaresFour;
  columns: string[];
  searchFields?: string[];
  primaryActionLabel?: string;
  filterLabels?: string[];
  workflowHint?: string;
};

export type RouteGroup = {
  moduleName: string;
  label: string;
  icon: typeof SquaresFour;
  permissionPrefixes?: string[];
  children: RouteConfig[];
};

export const routeGroups: RouteGroup[] = [
  {
    moduleName: "dashboard",
    label: "Tổng quan",
    icon: SquaresFour,
    children: [
      {
        path: "/dashboard",
        moduleName: "dashboard",
        title: "Tổng quan",
        subtitle: "KPI vận hành theo scope hiện tại.",
        permissionPrefixes: ["analytics.dashboard.read.", "organization."],
        kind: "dashboard",
        icon: SquaresFour,
        columns: [],
      },
      {
        path: "/analytics",
        moduleName: "dashboard.analytics",
        title: "Phân tích",
        subtitle: "Breakdown, trend và comparison từ response analytics.",
        permissionPrefixes: ["analytics.dashboard.read."],
        kind: "analytics",
        icon: ChartLineUp,
        columns: [],
      },
    ],
  },
  {
    moduleName: "organization",
    label: "Tổ chức",
    icon: Buildings,
    children: [
      route({
        path: "/organization/dioceses",
        moduleName: "organization.diocese",
        title: "Giáo phận",
        subtitle: "Quản lý thông tin giáo phận và liên đoàn.",
        endpoint: "/dioceses",
        kind: "dioceses",
        icon: Buildings,
        columns: ["name", "unionName", "chaplain", "phoneNumber", "email", "status"],
        permissionPrefixes: ["organization.diocese.read."],
        actionPermissionPrefixes: ["organization.diocese.create.", "organization.diocese.update."],
        primaryActionLabel: "Thêm giáo phận",
        filterLabels: ["Trạng thái", "Ngày thành lập"],
      }),
      route({
        path: "/organization/deaneries",
        moduleName: "organization.deanery",
        title: "Giáo hạt",
        subtitle: "Quản lý giáo hạt theo giáo phận được phân quyền.",
        endpoint: "/deaneries",
        kind: "deaneries",
        icon: Buildings,
        columns: ["name", "associationName", "dioceseId", "chaplain", "status"],
        permissionPrefixes: ["organization.deanery.read."],
        actionPermissionPrefixes: ["organization.deanery.create.", "organization.deanery.update."],
        primaryActionLabel: "Thêm giáo hạt",
        filterLabels: ["Giáo phận", "Trạng thái"],
      }),
      route({
        path: "/organization/parishes",
        moduleName: "organization.parish",
        title: "Giáo xứ",
        subtitle: "Quản lý giáo xứ và xứ đoàn theo giáo hạt.",
        endpoint: "/parishes",
        kind: "parishes",
        icon: Buildings,
        columns: ["name", "chapterName", "deaneryId", "chaplain", "status"],
        permissionPrefixes: ["organization.parish.read."],
        actionPermissionPrefixes: ["organization.parish.create.", "organization.parish.update."],
        primaryActionLabel: "Thêm giáo xứ",
        filterLabels: ["Giáo hạt", "Trạng thái"],
      }),
    ],
  },
  {
    moduleName: "leader",
    label: "Huynh trưởng",
    icon: UsersThree,
    children: [
      route({
        path: "/leaders",
        moduleName: "leader.list",
        title: "Huynh trưởng",
        subtitle: "Quản lý hồ sơ, ảnh đại diện và cấp hiện tại theo giáo xứ.",
        endpoint: "/leaders",
        kind: "leaders",
        icon: UsersThree,
        columns: ["imageUrl", "fullName", "holyName", "parishId", "leaderLevel", "email", "status"],
        permissionPrefixes: ["organization.leader.read."],
        actionPermissionPrefixes: ["organization.leader.create.", "organization.leader.update.", "organization.leader.delete."],
        primaryActionLabel: "Thêm huynh trưởng",
        filterLabels: ["Giáo xứ", "Cấp HT", "Trạng thái"],
        workflowHint: "Leader update không gửi fullName, birthDate hoặc leaderLevel.",
      }),
      route({
        path: "/leaders/profiles",
        moduleName: "leader.profile",
        title: "Hồ sơ huynh trưởng",
        subtitle: "Tra cứu hồ sơ chi tiết, ảnh đại diện, tài khoản và lịch sử tham dự.",
        endpoint: "/leaders",
        kind: "leaders",
        icon: UsersThree,
        columns: ["imageUrl", "fullName", "holyName", "birthDate", "leaderLevel", "parishId", "status"],
        permissionPrefixes: ["organization.leader.read."],
        actionPermissionPrefixes: ["organization.leader.update."],
        primaryActionLabel: "Mở hồ sơ",
        filterLabels: ["Giáo xứ", "Cấp HT", "Trạng thái"],
      }),
    ],
  },
  {
    moduleName: "executive-board",
    label: "Ban điều hành",
    icon: Crown,
    children: [
      route({
        path: "/executive-board/positions",
        moduleName: "executive-board.position",
        title: "Chức vụ",
        subtitle: "Thiết lập chức vụ theo cấp giáo phận, giáo hạt, giáo xứ.",
        endpoint: "/positions",
        kind: "positions",
        icon: Crown,
        columns: ["positionCode", "positionName", "positionType", "status"],
        permissionPrefixes: ["organization.position.read."],
        actionPermissionPrefixes: ["organization.position.create.", "organization.position.update."],
        primaryActionLabel: "Thêm chức vụ",
        filterLabels: ["Cấp áp dụng", "Trạng thái"],
      }),
      route({
        path: "/executive-board/assignments",
        moduleName: "executive-board.assignment",
        title: "Phân công ban điều hành",
        subtitle: "Theo dõi phân công chức vụ trong từng đơn vị.",
        endpoint: "/executive-board/assignments",
        kind: "executive-board",
        icon: IdentificationCard,
        columns: ["leaderFullName", "positionName", "unitType", "unitId", "startDate", "endDate", "status"],
        permissionPrefixes: ["organization.executive_board.read.", "organization.executive_board_assignment.read."],
        actionPermissionPrefixes: ["organization.executive_board.create.", "organization.executive_board_assignment.create."],
        primaryActionLabel: "Phân công",
        filterLabels: ["Loại đơn vị", "Đơn vị", "Chức vụ", "Trạng thái"],
        workflowHint: "endDate không được trước startDate; mỗi chức vụ active-current chỉ có một leader trong một unit.",
      }),
    ],
  },
  {
    moduleName: "training",
    label: "Huấn luyện",
    icon: GraduationCap,
    children: [
      route({
        path: "/training/requirements",
        moduleName: "training.requirement",
        title: "Điều kiện khóa",
        subtitle: "Điều kiện level, tuổi, thâm niên và khóa tiên quyết.",
        endpoint: "/training/requirements",
        kind: "requirements",
        icon: ListChecks,
        columns: ["requirementCode", "requirementName", "courseType", "requiredCurrentLevel", "requiredMinAge", "status"],
        permissionPrefixes: ["training.requirement.read."],
        actionPermissionPrefixes: ["training.requirement.create.", "training.requirement.update."],
        primaryActionLabel: "Thêm điều kiện",
        filterLabels: ["Loại khóa", "Trạng thái"],
      }),
      route({
        path: "/training/courses",
        moduleName: "training.course",
        title: "Khóa huấn luyện",
        subtitle: "Thiết lập khóa, owner scope, thời gian và công thức điểm.",
        endpoint: "/training/courses",
        kind: "courses",
        icon: GraduationCap,
        columns: ["courseCode", "courseName", "courseType", "hostYear", "location", "registrationEndAt", "status"],
        permissionPrefixes: ["training.course.read."],
        actionPermissionPrefixes: ["training.course.create.", "training.course.update."],
        primaryActionLabel: "Tạo khóa",
        filterLabels: ["Năm", "Loại khóa", "Trạng thái", "Thời gian đăng ký"],
        workflowHint: "Mỗi khóa phải có scoreFormulaId cùng owner scope.",
      }),
      route({
        path: "/training/score-components",
        moduleName: "training.score-component",
        title: "Thành phần điểm",
        subtitle: "Biến điểm reusable cho công thức chấm điểm.",
        endpoint: "/training/score-components",
        kind: "score-components",
        icon: ChartBar,
        columns: ["code", "name", "maxScore", "unitType", "displayOrder", "status"],
        permissionPrefixes: ["training.score_component.read."],
        actionPermissionPrefixes: ["training.score_component.create.", "training.score_component.update."],
        primaryActionLabel: "Thêm thành phần",
        filterLabels: ["Cấp quản lý", "Trạng thái"],
      }),
      route({
        path: "/training/score-formulas",
        moduleName: "training.score-formula",
        title: "Công thức điểm",
        subtitle: "Công thức, passing score và trạng thái khóa theo dữ liệu chấm.",
        endpoint: "/training/score-formulas",
        kind: "score-formulas",
        icon: Calculator,
        columns: ["code", "name", "expression", "passingScore", "locked", "status"],
        permissionPrefixes: ["training.score_formula.read."],
        actionPermissionPrefixes: ["training.score_formula.create.", "training.score_formula.update."],
        primaryActionLabel: "Tạo công thức",
        filterLabels: ["Cấp quản lý", "Trạng thái khóa"],
        workflowHint: "Formula đã có participation totalScore thì không sửa trực tiếp.",
      }),
    ],
  },
  {
    moduleName: "training-workflow",
    label: "Quy trình huấn luyện",
    icon: ClipboardText,
    children: [
      route({
        path: "/training/registrations",
        moduleName: "training.registration",
        title: "Đăng ký tham dự",
        subtitle: "Chọn huynh trưởng, kiểm điều kiện và gửi batch đăng ký.",
        endpoint: "/training/participations",
        kind: "participations",
        icon: ClipboardText,
        columns: ["leaderFullName", "courseName", "eligible", "exceptionReason", "participationStatus", "status"],
        permissionPrefixes: ["training.registration.read.", "training.participation.read."],
        actionPermissionPrefixes: ["training.registration.create.", "training.registration.submit."],
        primaryActionLabel: "Gửi đăng ký",
        filterLabels: ["Khóa", "Cấp HT", "Điều kiện"],
        workflowHint: "Batch đăng ký là atomic; hồ sơ không đủ điều kiện phải nhập exception reason.",
      }),
      route({
        path: "/training/approvals",
        moduleName: "training.approval",
        title: "Duyệt đăng ký",
        subtitle: "Duyệt hoặc từ chối hồ sơ theo đúng cấp workflow.",
        endpoint: "/training/participations",
        kind: "participations",
        icon: ClipboardText,
        columns: ["leaderFullName", "courseName", "deaneryApprovalStatus", "dioceseApprovalStatus", "review", "status"],
        permissionPrefixes: ["training.registration.approve.", "training.participation.read."],
        actionPermissionPrefixes: ["training.registration.approve."],
        primaryActionLabel: "Duyệt hồ sơ",
        filterLabels: ["Khóa", "Đơn vị gửi", "Trạng thái"],
      }),
      route({
        path: "/training/participations",
        moduleName: "training.participation",
        title: "Danh sách tham dự",
        subtitle: "Theo dõi đăng ký, duyệt, chấm điểm và chứng nhận.",
        endpoint: "/training/participations",
        kind: "participations",
        icon: ClipboardText,
        columns: ["leaderFullName", "courseName", "participationStatus", "totalScore", "passed", "certificateApprovalStatus"],
        permissionPrefixes: ["training.participation.read.", "training.registration.read.", "training.registration.approve."],
        actionPermissionPrefixes: ["training.registration.approve.", "training.participation.score."],
        primaryActionLabel: "Xử lý hồ sơ",
        filterLabels: ["Khóa", "Đơn vị gửi", "Trạng thái", "Kết quả"],
        workflowHint: "Score form khóa khi certificateApprovalStatus là APPROVED.",
      }),
      route({
        path: "/training/scores",
        moduleName: "training.score",
        title: "Chấm điểm",
        subtitle: "Nhập điểm theo component của công thức khóa học.",
        endpoint: "/training/participations",
        kind: "participations",
        icon: ChartBar,
        columns: ["leaderFullName", "courseName", "scoreFormulaId", "totalScore", "passed", "certificateApprovalStatus"],
        permissionPrefixes: ["training.participation.score.", "training.participation.read."],
        actionPermissionPrefixes: ["training.participation.score."],
        primaryActionLabel: "Chấm điểm",
        filterLabels: ["Khóa", "Kết quả", "Chứng nhận"],
        workflowHint: "Request score phải gửi đúng và đủ component của formula, không vượt maxScore.",
      }),
    ],
  },
  {
    moduleName: "certificate",
    label: "Chứng nhận",
    icon: Certificate,
    children: [
      route({
        path: "/certificates",
        moduleName: "certificate.list",
        title: "Chứng nhận",
        subtitle: "Quản lý chứng nhận, duyệt ngoại lệ và khóa điểm sau approve.",
        endpoint: "/certificates",
        kind: "certificates",
        icon: Certificate,
        columns: ["certificateCode", "leaderFullName", "courseName", "totalScore", "passingScore", "approvalStatus", "status"],
        permissionPrefixes: ["training.certificate.read."],
        actionPermissionPrefixes: ["training.certificate.create.", "training.certificate.approve.", "training.certificate.update."],
        primaryActionLabel: "Tạo chứng nhận",
        filterLabels: ["Khóa", "Kết quả", "Trạng thái duyệt"],
        workflowHint: "Nếu chưa đạt passingScore, approve bắt buộc nhập approvalReason.",
      }),
      route({
        path: "/certificates/approvals",
        moduleName: "certificate.approval",
        title: "Duyệt chứng nhận",
        subtitle: "Hoàn tất chứng nhận và promotion sau khi hồ sơ đã chấm điểm.",
        endpoint: "/certificates",
        kind: "certificates",
        icon: Certificate,
        columns: ["leaderFullName", "courseName", "totalScore", "passingScore", "approvalReasonRequired", "approvalStatus"],
        permissionPrefixes: ["training.certificate.approve.", "training.certificate.read."],
        actionPermissionPrefixes: ["training.certificate.approve."],
        primaryActionLabel: "Duyệt chứng nhận",
        filterLabels: ["Khóa", "Trạng thái", "Ngoại lệ"],
        workflowHint: "Duyệt certificate có thể promote leader nhưng không được hạ cấp hiện tại.",
      }),
    ],
  },
  {
    moduleName: "system",
    label: "Hệ thống",
    icon: ShieldCheck,
    children: [
      route({
        path: "/system/accounts",
        moduleName: "system.account",
        title: "Tài khoản",
        subtitle: "Account, scope, primary role và trạng thái đăng nhập.",
        endpoint: "/system/accounts",
        kind: "accounts",
        icon: ShieldCheck,
        columns: ["username", "leaderFullName", "primaryRoleCode", "dioceseId", "deaneryId", "parishId", "status"],
        permissionPrefixes: ["system.account.read.", "system.account.manage."],
        actionPermissionPrefixes: ["system.account.create.", "system.account.manage."],
        primaryActionLabel: "Tạo tài khoản",
        filterLabels: ["Vai trò", "Scope", "Trạng thái"],
        workflowHint: "FE không gửi username/password/avatarUrl; backend tự sinh credential.",
      }),
      route({
        path: "/system/roles",
        moduleName: "system.role",
        title: "Vai trò",
        subtitle: "Vai trò nghiệp vụ, mô tả và thứ tự hiển thị.",
        endpoint: "/system/roles",
        kind: "roles",
        icon: LockKey,
        columns: ["roleCode", "roleName", "description", "displayOrder", "status"],
        permissionPrefixes: ["system.role.read.", "system.role.manage."],
        actionPermissionPrefixes: ["system.role.create.", "system.role.manage."],
        primaryActionLabel: "Thêm vai trò",
        filterLabels: ["Trạng thái"],
      }),
      route({
        path: "/system/permissions",
        moduleName: "system.permission",
        title: "Quyền hạn",
        subtitle: "Permission code do backend sinh từ module/resource/action/scope.",
        endpoint: "/system/permissions",
        kind: "permissions",
        icon: LockKey,
        columns: ["permissionCode", "permissionName", "moduleCode", "resourceCode", "actionCode", "scopeCode", "status"],
        permissionPrefixes: ["system.permission.read.", "system.permission.manage."],
        actionPermissionPrefixes: ["system.permission.create.", "system.permission.manage."],
        primaryActionLabel: "Thêm quyền",
        filterLabels: ["Module", "Resource", "Action", "Scope"],
      }),
      route({
        path: "/system/account-roles",
        moduleName: "system.account-role",
        title: "Gán vai trò",
        subtitle: "Quản lý vai trò tài khoản trong scope hợp lệ.",
        endpoint: "/system/account-roles",
        kind: "account-roles",
        icon: ShieldCheck,
        columns: ["username", "roleCode", "isPrimary", "assignedAt", "expiresAt", "status"],
        permissionPrefixes: ["system.account_role.read.", "system.account_role.assign."],
        actionPermissionPrefixes: ["system.account_role.assign."],
        primaryActionLabel: "Gán vai trò",
        filterLabels: ["Vai trò", "Trạng thái", "Hết hạn"],
      }),
      route({
        path: "/system/role-permissions",
        moduleName: "system.role-permission",
        title: "Phân quyền vai trò",
        subtitle: "Grant hoặc revoke permission cho role được phép quản lý.",
        endpoint: "/system/role-permissions",
        kind: "role-permissions",
        icon: LockKey,
        columns: ["roleCode", "permissionCode", "effect", "assignedAt", "expiresAt", "status"],
        permissionPrefixes: ["system.role_permission.read.", "system.role_permission.assign.", "system.role_permission.revoke."],
        actionPermissionPrefixes: ["system.role_permission.assign.", "system.role_permission.revoke."],
        primaryActionLabel: "Cập nhật ma trận",
        filterLabels: ["Vai trò", "Module", "Effect"],
      }),
      route({
        path: "/system/account-permissions",
        moduleName: "system.account-permission",
        title: "Quyền riêng tài khoản",
        subtitle: "ALLOW hoặc DENY trực tiếp theo tài khoản.",
        endpoint: "/system/account-permissions",
        kind: "account-permissions",
        icon: Medal,
        columns: ["username", "permissionCode", "effect", "reason", "expiresAt", "status"],
        permissionPrefixes: ["system.account_permission.read.", "system.account_permission.manage."],
        actionPermissionPrefixes: ["system.account_permission.manage."],
        primaryActionLabel: "Thêm quyền riêng",
        filterLabels: ["Tài khoản", "Effect", "Hết hạn"],
      }),
      route({
        path: "/notifications",
        moduleName: "system.notification",
        title: "Thông báo",
        subtitle: "Inbox workflow và realtime notification theo user hiện tại.",
        endpoint: "/system/notifications",
        kind: "notifications",
        icon: Bell,
        columns: ["title", "eventType", "courseCode", "readAt", "createdAt", "status"],
        permissionPrefixes: [],
        primaryActionLabel: "Đánh dấu đã đọc",
        filterLabels: ["Tất cả", "Chưa đọc", "Đã đọc"],
      }),
      route({
        path: "/system/audit-logs",
        moduleName: "system.audit-log",
        title: "Nhật ký hệ thống",
        subtitle: "Lịch sử thao tác trong 10 ngày gần nhất.",
        endpoint: "/system/audit-logs",
        kind: "audit-logs",
        icon: FileText,
        columns: ["loggedAt", "username", "action", "resourceType", "unitType", "ipAddress"],
        permissionPrefixes: ["system.audit_log.read."],
        filterLabels: ["Người thực hiện", "Module", "Hành động", "Thời gian"],
      }),
    ],
  },
];

export const routes = routeGroups.flatMap((group) => group.children);

function route(config: RouteConfig): RouteConfig {
  return {
    ...config,
    searchFields: config.searchFields ?? config.columns.filter((column) => !column.toLowerCase().includes("status")).slice(0, 3),
  };
}

export function findRoute(path: string) {
  return routes.find((routeConfig) => routeConfig.path === path);
}
