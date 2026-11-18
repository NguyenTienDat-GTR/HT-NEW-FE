// DISABLED: khóa không mở đăng ký (cờ registrationEnabled = false), chỉ suy ra ở FE; BE lưu trạng thái CLOSED.
export type RegistrationState = "OPEN" | "CLOSED" | "NOT_STARTED" | "ENDED" | "DISABLED";
export type OrganizingState = "UPCOMING" | "ONGOING" | "ENDED";
export type StatusTone = "neutral" | "success" | "warning" | "info";

type CourseStatusRow = {
  registrationStatus?: unknown;
  registrationEnabled?: unknown;
  organizingStatus?: unknown;
  registrationStartAt?: unknown;
  registrationEndAt?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  startTime?: unknown;
  endTime?: unknown;
};

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
// Điểm danh / quét QR được mở sớm hơn giờ bắt đầu khóa tối đa 2 tiếng (BE cũng kiểm tra như vậy).
export const ATTENDANCE_EARLY_MS = 2 * 60 * 60 * 1000;

// Thời điểm hiện tại theo giờ Việt Nam, dạng "yyyy-MM-ddTHH:mm" để so sánh chuỗi với mốc của khóa.
function vietnamLocalNow(now: Date) {
  return new Date(now.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 16);
}

function timeText(value: unknown, fallback: string) {
  return typeof value === "string" && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : fallback;
}

// Mốc bắt đầu / kết thúc của khóa (giờ Việt Nam, "yyyy-MM-ddTHH:mm"); khóa chưa có giờ thì 00:00 và 23:59 như trước đây.
export function courseStartLocal(row: Pick<CourseStatusRow, "startDate" | "startTime">) {
  return typeof row.startDate === "string" && row.startDate ? `${row.startDate.slice(0, 10)}T${timeText(row.startTime, "00:00")}` : undefined;
}

export function courseEndLocal(row: Pick<CourseStatusRow, "endDate" | "endTime">) {
  return typeof row.endDate === "string" && row.endDate ? `${row.endDate.slice(0, 10)}T${timeText(row.endTime, "23:59")}` : undefined;
}

// "08:00 10-12-2026" (khóa quá khứ hoặc thiếu giờ thì chỉ ngày "10-12-2026"); rỗng nếu chưa có ngày.
export function formatCourseMoment(row: CourseStatusRow & { pastCourse?: unknown }, which: "start" | "end") {
  const date = which === "start" ? row.startDate : row.endDate;
  const time = which === "start" ? row.startTime : row.endTime;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(date)) return null;
  const [year, month, day] = date.slice(0, 10).split("-");
  const text = `${day}-${month}-${year}`;
  return row.pastCourse === true || typeof time !== "string" || !time ? text : `${time.slice(0, 5)} ${text}`;
}

// Từ lúc này (ms) khóa được điểm danh / quét QR; undefined nếu khóa chưa có ngày bắt đầu.
export function courseAttendanceOpensAtMs(row: Pick<CourseStatusRow, "startDate" | "startTime">) {
  const start = courseStartLocal(row);
  return start ? new Date(`${start}:00+07:00`).getTime() - ATTENDANCE_EARLY_MS : undefined;
}

export const registrationStateLabels: Record<RegistrationState, string> = {
  OPEN: "Đang mở",
  CLOSED: "Đã đóng",
  NOT_STARTED: "Chưa đến giờ",
  ENDED: "Đã hết hạn",
  DISABLED: "Không mở đăng ký",
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
  DISABLED: "neutral",
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
  // Khóa đã diễn ra (tới ngày bắt đầu) hoặc đã kết thúc thì bắt buộc đã đóng đăng ký (BE cũng ép như vậy), kể cả khi cờ mở đăng ký còn bật
  // hoặc trạng thái lưu chưa kịp cập nhật.
  if (resolveOrganizingState(row, new Date(now)) !== "UPCOMING") return "ENDED";
  if (row.registrationEnabled === false) return "DISABLED";
  if (isRegistrationState(row.registrationStatus)) return row.registrationStatus;
  const start = toTime(row.registrationStartAt);
  const end = toTime(row.registrationEndAt);
  if (end !== undefined && now > end) return "ENDED";
  if (start !== undefined && now < start) return "NOT_STARTED";
  return "OPEN";
}

export function resolveOrganizingState(row: CourseStatusRow, now = new Date()): OrganizingState {
  if (isOrganizingState(row.organizingStatus)) return row.organizingStatus;
  const current = vietnamLocalNow(now);
  const start = courseStartLocal(row);
  const end = courseEndLocal(row);
  if (end && current > end) return "ENDED";
  if (!start || current < start) return "UPCOMING";
  return "ONGOING";
}

// Đã quá giờ kết thúc dự kiến (giờ Việt Nam).
export function isPastCourseEnd(row: Pick<CourseStatusRow, "endDate" | "endTime">, now = new Date()) {
  const end = courseEndLocal(row);
  return end !== undefined && vietnamLocalNow(now) > end;
}

// Khóa đã kết thúc: kết thúc thủ công, hoặc quá giờ kết thúc (giờ Việt Nam) dù trạng thái lưu chưa kịp cập nhật.
// BE không cho sửa khóa đã kết thúc; FE dùng để ẩn nút sửa.
export function isCourseEnded(row: CourseStatusRow & { finishedAt?: unknown }, now = new Date()) {
  if (row.finishedAt) return true;
  return isPastCourseEnd(row, now) || resolveOrganizingState(row, now) === "ENDED";
}

// Khóa đang trong thời gian diễn ra theo ngày + giờ bắt đầu/kết thúc (giờ Việt Nam), không phụ thuộc trạng thái đã lưu
// (trạng thái lưu chỉ cập nhật khi sửa khóa hoặc khi job định kỳ chạy). Giống quy tắc kiểm tra của BE khi chấm điểm.
export function isCourseWithinDates(row: Pick<CourseStatusRow, "startDate" | "endDate" | "startTime" | "endTime">, now = new Date()) {
  const current = vietnamLocalNow(now);
  const start = courseStartLocal(row);
  const end = courseEndLocal(row);
  if (!start || current < start) return false;
  return !end || current <= end;
}
