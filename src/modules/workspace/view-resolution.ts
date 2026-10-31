import type { ResourceKind, RouteConfig } from "@/config/routes/routes";

/** Khóa của từng màn hình mà trang workspace có thể hiển thị. Thêm màn mới = thêm khóa + một dòng trong bảng bên dưới. */
export type WorkspaceViewKey =
  | "leader-detail"
  | "course-detail"
  | "form-create"
  | "form-edit"
  | "form-revoke"
  | "form-score"
  | "dashboard"
  | "analytics"
  | "certificate-config"
  | "cross-deanery"
  | "badge-config"
  | "leader-levels"
  | "my-permissions"
  | "resource";

type MatchType = "list" | "detail" | "create" | "edit" | "score" | "matrix" | "revoke";

// Trang chi tiết có màn riêng theo loại tài nguyên; loại khác dùng ngăn chi tiết trong danh sách.
const DETAIL_VIEWS: Partial<Record<ResourceKind, WorkspaceViewKey>> = {
  leaders: "leader-detail",
  courses: "course-detail",
};

// Các đường dẫn biểu mẫu dùng chung một trang biểu mẫu, khác nhau ở chế độ.
const FORM_VIEWS: Partial<Record<MatchType, WorkspaceViewKey>> = {
  create: "form-create",
  edit: "form-edit",
  revoke: "form-revoke",
  score: "form-score",
};

// Màn hình tự quản (không đi qua bộ hiển thị danh sách tài nguyên chung).
const STANDALONE_VIEWS: Partial<Record<ResourceKind, WorkspaceViewKey>> = {
  dashboard: "dashboard",
  analytics: "analytics",
  "certificate-config": "certificate-config",
  "cross-deanery": "cross-deanery",
  "badge-config": "badge-config",
  "leader-levels": "leader-levels",
  "my-permissions": "my-permissions",
};

export function resolveWorkspaceView(matchType: MatchType, route: Pick<RouteConfig, "kind">): WorkspaceViewKey {
  if (matchType === "detail") {
    const detail = DETAIL_VIEWS[route.kind];
    if (detail) return detail;
  }
  const form = FORM_VIEWS[matchType];
  if (form) return form;
  return STANDALONE_VIEWS[route.kind] ?? "resource";
}

/** Nhóm module hiển thị danh sách tài nguyên. Quy tắc đầu tiên khớp tiền tố tên module sẽ được chọn (thứ tự quan trọng). */
export type ResourceModuleKey = "leader" | "organization" | "executive-board" | "training-workflow" | "training" | "certificate" | "system";

const RESOURCE_MODULE_RULES: { module: ResourceModuleKey; prefixes: string[] }[] = [
  { module: "leader", prefixes: ["leader."] },
  { module: "organization", prefixes: ["organization."] },
  { module: "executive-board", prefixes: ["executive-board."] },
  {
    module: "training-workflow",
    prefixes: ["training-workflow.", "training.registration", "training.approval", "training.participation", "training.score"],
  },
  { module: "training", prefixes: ["training."] },
  { module: "certificate", prefixes: ["certificate."] },
];

export function resolveResourceModule(moduleName: string): ResourceModuleKey {
  const rule = RESOURCE_MODULE_RULES.find((item) => item.prefixes.some((prefix) => moduleName.startsWith(prefix)));
  return rule?.module ?? "system";
}
