import type { ParticipantDetail } from "./types";

export function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

export function genderLabel(value?: string | null) {
  if (value === "NAM") return "Nam";
  if (value === "NU") return "Nữ";
  return value ?? "";
}

// Nhãn tình trạng email: lỗi gần nhất được ưu tiên, rồi đã gửi, thiếu / sai email, cuối cùng là chưa gửi.
export function invitationLabel(detail: Pick<ParticipantDetail, "invitationError" | "invitationSentAt" | "emailProblem">): { label: string; tone: "success" | "warning" | "danger" | undefined } {
  if (detail.invitationError) return { label: "Gửi lỗi", tone: "danger" };
  if (detail.invitationSentAt) return { label: "Đã gửi", tone: "success" };
  if (detail.emailProblem) return { label: detail.emailProblem.startsWith("Email không hợp lệ") ? "Email sai định dạng" : "Chưa có email", tone: "warning" };
  return { label: "Chưa gửi", tone: undefined };
}
