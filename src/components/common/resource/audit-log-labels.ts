// Nhãn tiếng Việt cho các cột truy vết của nhật ký hệ thống.
import { formatPermissionTaxonomyValue } from "./permission-taxonomy-labels";

export const AUDIT_OPERATION_LABELS: Record<string, string> = {
  LIST: "Xem danh sách",
  VIEW: "Xem chi tiết",
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  TOGGLE_STATUS: "Bật/tắt trạng thái",
  APPROVE: "Duyệt",
  REJECT: "Từ chối",
  SUBMIT: "Gửi",
  REVOKE: "Thu hồi",
  REISSUE: "Cấp lại",
  SCORE: "Chấm điểm",
  SCORE_LOCK: "Khóa/mở điểm",
  FINISH: "Kết thúc khóa",
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  REFRESH: "Làm mới phiên",
  WITHDRAW: "Thu hồi đăng ký",
  EXPORT: "Xuất dữ liệu",
};

// Thao tác ít gặp (đoạn cuối đường dẫn API); chỉ dùng để hiển thị, không đưa vào bộ lọc cho gọn.
const AUDIT_EXTRA_OPERATION_LABELS: Record<string, string> = {
  CANCEL: "Hủy",
  TRANSFER: "Chuyển đơn vị",
  RESOLVE_DUPLICATES: "Xử lý trùng lặp",
  DIVIDE: "Chia nhóm",
  SCAN: "Quét điểm danh",
  LOOKUP: "Tra cứu",
  RESET_PASSWORD: "Đặt lại mật khẩu",
  DECISION: "Quyết định",
  DIOCESE_APPROVAL: "Giáo phận duyệt",
  DEANERY_APPROVAL: "Giáo hạt duyệt",
  BULK_APPROVAL: "Duyệt hàng loạt",
  BULK: "Thao tác hàng loạt",
  IMPORT: "Nhập từ Excel",
  PREVIEW: "Xem trước",
  PREVIEW_PDF: "Xem trước PDF",
  EXPORT_PDF: "Xuất PDF",
  JOBS: "Tạo tiến trình xuất",
  OTP: "Gửi mã xác thực",
  VERIFY: "Xác thực mã",
  CHANGE_PASSWORD: "Đổi mật khẩu",
  PASSWORD: "Mật khẩu",
  DEVICES: "Đăng ký thiết bị",
  SEND: "Gửi",
  RESET: "Đặt lại",
  PARENT: "Đổi đơn vị cha",
  PROMOTE: "Thăng cấp",
  READ: "Đánh dấu đã đọc",
  BIRTH_DATE: "Sửa ngày sinh",
  REGISTRATION: "Cập nhật đăng ký",
  SCORE_NOTE: "Nhận xét điểm",
  REGISTRATION_NOTE: "Ghi chú đăng ký",
  ASSIGNMENTS: "Cập nhật phân công",
  REORDER: "Sắp xếp thứ tự",
  DEFAULT: "Đặt mặc định",
  SITE_SUBDOMAIN: "Đổi tên miền con",
  FILE: "Tải tệp lên",
  PROFILE: "Cập nhật hồ sơ",
  EMAIL: "Đổi email",
  AVATAR: "Đổi ảnh đại diện",
  EXCEPTION_CERTIFICATE: "Tạo chứng nhận ngoại lệ",
  PRIVACY_CONSENT: "Đồng ý chính sách bảo mật",
  PREREQUISITE_COPY: "Sao chép điều kiện",
  PAST: "Tạo khóa đã diễn ra",
  REQUESTS: "Gửi yêu cầu",
  REGISTRATIONS: "Đăng ký tham dự",
  CHECK_IN: "Điểm danh",
  STOP: "Dừng",
};

export type AuditTone = "success" | "info" | "warning" | "danger" | "neutral";

export function auditOperationLabel(value: string) {
  return AUDIT_OPERATION_LABELS[value] ?? AUDIT_EXTRA_OPERATION_LABELS[value] ?? "Thao tác khác";
}

const HTTP_METHOD_LABELS: Record<string, string> = {
  GET: "Xem dữ liệu",
  POST: "Gửi dữ liệu",
  PUT: "Cập nhật",
  PATCH: "Cập nhật một phần",
  DELETE: "Xóa",
};

/** Phương thức HTTP bằng tiếng Việt, kèm mã kỹ thuật trong ngoặc. */
export function auditMethodText(method: string) {
  const upper = method.toUpperCase();
  return HTTP_METHOD_LABELS[upper] ? `${HTTP_METHOD_LABELS[upper]} (${upper})` : method;
}

export function auditOperationTone(value: string): AuditTone {
  if (value === "DELETE" || value === "REJECT" || value === "REVOKE") return "danger";
  if (value === "CREATE" || value === "APPROVE") return "success";
  if (value === "LIST" || value === "VIEW") return "neutral";
  return "info";
}

const STATUS_TEXT: Record<number, string> = {
  200: "Thành công",
  201: "Đã tạo",
  204: "Thành công",
  400: "Dữ liệu không hợp lệ",
  401: "Chưa đăng nhập",
  403: "Không đủ quyền",
  404: "Không tìm thấy",
  409: "Xung đột dữ liệu",
  422: "Dữ liệu không hợp lệ",
  429: "Quá nhiều yêu cầu",
  500: "Lỗi hệ thống",
};

export function auditStatusText(code: number) {
  return STATUS_TEXT[code] ?? (code < 300 ? "Thành công" : code < 500 ? "Yêu cầu bị từ chối" : "Lỗi hệ thống");
}

export function auditStatusTone(code: number): AuditTone {
  if (code < 400) return "success";
  if (code < 500) return "warning";
  return "danger";
}

/** Tên đối tượng nếu có; không có thì mã đối tượng; cả hai đều không có (thao tác trên danh sách) thì null. */
export function auditTargetText(row: Record<string, unknown>) {
  const name = typeof row.resourceName === "string" ? row.resourceName.trim() : "";
  if (name) return name;
  const id = typeof row.resourceId === "string" ? row.resourceId.trim() : "";
  return id ? `Mã ${id}` : null;
}

/**
 * Nội dung tiếng Việt của một dòng nhật ký, dựng từ thao tác + loại đối tượng + tên đối tượng.
 * Trường `message` do BE ghi là chuỗi kỹ thuật ("GET /api/...") nên không hiển thị cho người dùng.
 */
export function auditMessageText(row: Record<string, unknown>) {
  const operation = typeof row.operation === "string" && row.operation ? auditOperationLabel(row.operation) : "";
  const resource = typeof row.resource === "string" && row.resource ? (formatPermissionTaxonomyValue("resource", row.resource) ?? "") : "";
  const target = auditTargetText(row);
  return [[operation, resource].filter(Boolean).join(" "), target].filter(Boolean).join(": ");
}

/** Các loại đối tượng có thể gặp trong nhật ký, dùng cho bộ lọc. */
export const AUDIT_RESOURCE_KEYS = [
  "diocese", "deanery", "parish", "leader", "leader_level", "position", "executive_board_assignment",
  "course", "course_type", "score_component", "requirement", "participation", "certificate", "certificate_config", "registration_template",
  "account", "role", "permission", "notification", "audit_log", "analytics", "auth",
] as const;
