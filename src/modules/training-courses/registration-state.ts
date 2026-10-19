export type RegistrationState = "OPEN" | "MANUALLY_CLOSED" | "NOT_STARTED" | "ENDED";

type CourseRegistrationRow = {
  registrationOpen?: unknown;
  registrationStartAt?: unknown;
  registrationEndAt?: unknown;
};

function toTime(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}

// Suy ra trạng thái đăng ký từ cờ mở/đóng của BE và khung thời gian đăng ký.
export function resolveRegistrationState(row: CourseRegistrationRow, now = Date.now()): RegistrationState {
  const start = toTime(row.registrationStartAt);
  const end = toTime(row.registrationEndAt);
  if (end !== undefined && now > end) return "ENDED";
  if (row.registrationOpen === false) return "MANUALLY_CLOSED";
  if (start !== undefined && now < start) return "NOT_STARTED";
  return "OPEN";
}

export const registrationStateLabels: Record<RegistrationState, string> = {
  OPEN: "Đang mở đăng ký",
  MANUALLY_CLOSED: "Đã đóng đăng ký",
  NOT_STARTED: "Chưa đến giờ đăng ký",
  ENDED: "Đã hết hạn đăng ký",
};
