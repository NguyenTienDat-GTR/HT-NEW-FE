import { apiDownload, apiFetch, apiMutation, parseContentDispositionFilename, type PageResponse } from "@/lib/api/client";
import { badgeExportBody, buildParticipantParams, invitationBody, type ParticipantQueryState } from "./participant-query";
import { pollUntilDone } from "./job-runner";
import type {
  AttendanceSummary,
  BadgeExportOptions,
  BadgeJob,
  InvitationJob,
  InvitationOptions,
  ParticipantDetail,
  ParticipantRow,
  ScanResult,
  UsableBadgeConfig,
} from "./types";

const base = (courseCode: string) => `/training/courses/${encodeURIComponent(courseCode)}`;

export const participantKeys = {
  all: (courseCode: string) => ["course-participants", courseCode] as const,
  summary: (courseCode: string) => ["course-participants", courseCode, "summary"] as const,
  list: (courseCode: string, params: string) => ["course-participants", courseCode, "list", params] as const,
};

export function fetchSummary(courseCode: string) {
  return apiFetch<AttendanceSummary>(`${base(courseCode)}/attendance/summary`);
}

export function fetchBadgeConfigs(courseCode: string) {
  return apiFetch<UsableBadgeConfig[]>(`${base(courseCode)}/badges/configs`);
}

export function fetchParticipants(courseCode: string, state: ParticipantQueryState) {
  return apiFetch<PageResponse<ParticipantRow>>(`${base(courseCode)}/attendance/participants?${buildParticipantParams(state)}`);
}

export function fetchParticipantDetail(courseCode: string, participationId: string) {
  return apiFetch<ParticipantDetail>(`${base(courseCode)}/attendance/participants/${encodeURIComponent(participationId)}`);
}

// Quét ở header không chọn khóa (courseCode rỗng): khóa nằm trong chính mã QR và BE tự kiểm tra khóa có đang điểm danh được không.
const attendancePath = (courseCode: string | undefined, action: "scan" | "lookup") =>
  courseCode ? `${base(courseCode)}/attendance/${action}` : `/training/attendance/${action}`;

export function scanAttendance(courseCode: string | undefined, token: string) {
  return apiMutation<ScanResult>(attendancePath(courseCode, "scan"), "POST", { token });
}

// Tra cứu mã QR (chưa điểm danh) để người dùng xác nhận.
export function lookupAttendance(courseCode: string | undefined, token: string) {
  return apiMutation<ScanResult>(attendancePath(courseCode, "lookup"), "POST", { token });
}

export function setCheckedIn(courseCode: string, participationId: string, checkedIn: boolean) {
  return apiMutation<ScanResult>(`${base(courseCode)}/attendance/participants/${encodeURIComponent(participationId)}`, "PUT", { checkedIn });
}

// Gửi email thông tin tham dự chạy nền: tạo job rồi hỏi trạng thái tới khi xong. Kết quả liệt kê hồ sơ không gửi được.
export async function sendInvitations(courseCode: string, options: InvitationOptions, onTick?: (job: InvitationJob) => void): Promise<InvitationJob> {
  const first = await apiMutation<InvitationJob>(`${base(courseCode)}/invitations/send`, "POST", invitationBody(options));
  const done = await pollUntilDone(first, (current) => apiFetch<InvitationJob>(`${base(courseCode)}/invitations/jobs/${encodeURIComponent(current.jobId)}`), { onTick });
  if (done.status === "FAILED") throw new Error(done.error || "Không thể gửi email thông tin tham dự");
  return done;
}

// Xuất PDF thẻ chạy nền rồi tải về máy. Trả tên file và số thẻ.
export async function exportBadges(courseCode: string, options: BadgeExportOptions): Promise<{ filename: string; badgeCount: number; pageCount: number }> {
  const first = await apiMutation<BadgeJob>(`${base(courseCode)}/badges/export/jobs`, "POST", badgeExportBody(options));
  const done = await pollUntilDone(first, (current) => apiFetch<BadgeJob>(`${base(courseCode)}/badges/export/jobs/${encodeURIComponent(current.jobId)}`));
  if (done.status !== "DONE") throw new Error(done.error || "Không thể tạo PDF thẻ tham dự");

  const response = await apiDownload(`${base(courseCode)}/badges/export/jobs/${encodeURIComponent(done.jobId)}/file`);
  const blob = await response.blob();
  const filename = parseContentDispositionFilename(response.headers.get("content-disposition")) ?? done.filename ?? "the-tham-du.pdf";
  saveBlob(blob, filename);
  return { filename, badgeCount: done.badgeCount ?? 0, pageCount: done.pageCount ?? 0 };
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
