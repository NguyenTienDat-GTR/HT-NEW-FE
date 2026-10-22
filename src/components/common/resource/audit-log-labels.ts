// Nhãn tiếng Việt cho các cột truy vết của nhật ký hệ thống.

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

export type AuditTone = "success" | "info" | "warning" | "danger" | "neutral";

export function auditOperationLabel(value: string) {
  return AUDIT_OPERATION_LABELS[value] ?? value.replace(/_/g, " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
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

/** Các loại đối tượng có thể gặp trong nhật ký, dùng cho bộ lọc. */
export const AUDIT_RESOURCE_KEYS = [
  "diocese", "deanery", "parish", "leader", "leader_level", "position", "executive_board_assignment",
  "course", "course_type", "score_component", "requirement", "participation", "certificate", "certificate_config",
  "account", "role", "permission", "notification", "audit_log", "analytics", "auth",
] as const;
