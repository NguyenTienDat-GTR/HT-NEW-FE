const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/;
const TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;

export function formatVietnamDate(value: string | null | undefined) {
  if (!value) return null;

  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

export function formatVietnamDateTime(value: string | null | undefined) {
  if (!value) return null;

  const normalized = normalizeDateTime(value);
  if (!normalized) return null;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return `${pick("hour")}:${pick("minute")}:${pick("second")} ${pick("day")}-${pick("month")}-${pick("year")}`;
}

export function formatVietnamDateValue(value: string | null | undefined) {
  if (!value) return null;

  const trimmed = value.trim();
  if (DATE_TIME_PATTERN.test(trimmed)) return formatVietnamDateTime(trimmed);
  return formatVietnamDate(trimmed);
}

function normalizeDateTime(value: string) {
  const trimmed = value.trim();
  if (!DATE_TIME_PATTERN.test(trimmed)) return null;

  const withSeparator = trimmed.replace(" ", "T");
  return TIME_ZONE_PATTERN.test(withSeparator) ? withSeparator : `${withSeparator}+07:00`;
}
