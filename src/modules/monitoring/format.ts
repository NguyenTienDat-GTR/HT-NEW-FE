import { viNumber } from "@/lib/utils";
import type { MonitoringTimelinePoint } from "@/modules/monitoring/types";

export const MONITORING_RANGES = [
  { hours: 1, label: "1 giờ" },
  { hours: 6, label: "6 giờ" },
  { hours: 24, label: "24 giờ" },
  { hours: 72, label: "3 ngày" },
  { hours: 168, label: "7 ngày" },
  { hours: 240, label: "10 ngày" },
] as const;

const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parts(value: string) {
  const found = Object.fromEntries(dateTimeFormat.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return { date: `${found.day}/${found.month}`, time: `${found.hour}:${found.minute}` };
}

/** Giờ Việt Nam, không phụ thuộc múi giờ của máy đang xem. */
export function formatMonitoringTime(value: string) {
  const { date, time } = parts(value);
  return `${time} ${date}`;
}

export function timelineRows(points: MonitoringTimelinePoint[]) {
  return points.map((point) => ({
    period: formatMonitoringTime(point.time),
    requests: point.requests,
    serverErrors: point.serverErrors,
    deniedRequests: point.deniedRequests,
    p95Ms: point.p95Ms,
  }));
}

export function formatDuration(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${viNumber.format(ms)} ms`;
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(ms / 1000)} giây`;
}

export type MonitoringChange = { text: string; direction: "up" | "down" | "same" };

/** So với kỳ liền trước; null khi không có kỳ trước để so sánh. */
export function compareWithPrevious(current: number | null | undefined, previous: number | null | undefined): MonitoringChange | null {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) return { text: "Không đổi", direction: "same" };
  const direction = delta > 0 ? "up" : "down";
  const sign = delta > 0 ? "+" : "−";
  if (previous === 0) return { text: `${sign}${viNumber.format(Math.abs(delta))}`, direction };
  const percent = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format((Math.abs(delta) / previous) * 100);
  return { text: `${sign}${percent}%`, direction };
}
