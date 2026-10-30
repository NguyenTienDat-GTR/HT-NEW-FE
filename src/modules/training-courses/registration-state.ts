export type RegistrationState = "OPEN" | "CLOSED" | "NOT_STARTED" | "ENDED";
export type OrganizingState = "UPCOMING" | "ONGOING" | "ENDED";
export type StatusTone = "neutral" | "success" | "warning" | "info";

type CourseStatusRow = {
  registrationStatus?: unknown;
  organizingStatus?: unknown;
  registrationStartAt?: unknown;
  registrationEndAt?: unknown;
  startDate?: unknown;
  endDate?: unknown;
};

export const registrationStateLabels: Record<RegistrationState, string> = {
  OPEN: "Đang mở",
  CLOSED: "Đã đóng",
  NOT_STARTED: "Chưa đến giờ",
  ENDED: "Đã hết hạn",
};

export const organizingStateLabels: Record<OrganizingState, string> = {
  UPCOMING: "Sắp diễn ra",
  ONGOING: "Đang diễn ra",
  ENDED: "Đã kết thúc",
};

// Màu theo token: success / info / warning / muted.
export const registrationStateTones: Record<RegistrationState, StatusTone> = {
  OPEN: "success",
  CLOSED: "warning",
  NOT_STARTED: "info",
  ENDED: "neutral",
};

export const organizingStateTones: Record<OrganizingState, StatusTone> = {
  UPCOMING: "info",
  ONGOING: "success",
  ENDED: "neutral",
};

function toTime(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function isRegistrationState(value: unknown): value is RegistrationState {
  return typeof value === "string" && value in registrationStateLabels;
}

function isOrganizingState(value: unknown): value is OrganizingState {
  return typeof value === "string" && value in organizingStateLabels;
}

// Ưu tiên trạng thái BE đã lưu (scheduler tự chuyển); fallback suy ra từ khung thời gian khi BE chưa trả.
export function resolveRegistrationState(row: CourseStatusRow, now = Date.now()): RegistrationState {
  // Khóa đã kết thúc thì bắt buộc đã đóng đăng ký (BE cũng ép như vậy), kể cả khi trạng thái lưu chưa kịp cập nhật.
  if (resolveOrganizingState(row, new Date(now)) === "ENDED") return "ENDED";
  if (isRegistrationState(row.registrationStatus)) return row.registrationStatus;
  const start = toTime(row.registrationStartAt);
  const end = toTime(row.registrationEndAt);
  if (end !== undefined && now > end) return "ENDED";
  if (start !== undefined && now < start) return "NOT_STARTED";
  return "OPEN";
}

export function resolveOrganizingState(row: CourseStatusRow, now = new Date()): OrganizingState {
  if (isOrganizingState(row.organizingStatus)) return row.organizingStatus;
  const today = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const start = typeof row.startDate === "string" ? row.startDate : undefined;
  const end = typeof row.endDate === "string" ? row.endDate : undefined;
  if (end && today > end) return "ENDED";
  if (!start || today < start) return "UPCOMING";
  return "ONGOING";
}

// Khóa đang trong thời gian diễn ra theo ngày bắt đầu/kết thúc (giờ Việt Nam), không phụ thuộc trạng thái đã lưu
// (trạng thái lưu chỉ cập nhật khi sửa khóa hoặc khi job định kỳ chạy). Giống quy tắc kiểm tra của BE khi chấm điểm.
export function isCourseWithinDates(row: Pick<CourseStatusRow, "startDate" | "endDate">, now = new Date()) {
  const today = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const start = typeof row.startDate === "string" ? row.startDate : undefined;
  const end = typeof row.endDate === "string" ? row.endDate : undefined;
  if (!start || today < start) return false;
  return !end || today <= end;
}
