import { formatVietnamDateValue } from "@/lib/date-format";
import type { CourseInfo } from "../types";

// Thông tin khóa huấn luyện để giáo hạt nhà cân nhắc khi cho phép khóa / duyệt yêu cầu liên giáo hạt.
export function CourseInfoBlock({ info, hostDeaneryName }: { info: CourseInfo | null | undefined; hostDeaneryName?: string | null }) {
  if (!info) return null;
  const rows: [string, string | null][] = [
    ["Loại khóa", info.courseTypeName],
    ["Giáo hạt tổ chức", hostDeaneryName ?? null],
    ["Địa điểm", info.location],
    ["Thời gian tổ chức", period(info.startDate, info.endDate)],
    ["Thời gian đăng ký", period(info.registrationStartAt, info.registrationEndAt)],
    ["Điều kiện tham dự", info.requirements.length ? info.requirements.join("; ") : null],
    ["Ghi chú của khóa", info.additionalNotes],
  ];
  const shown = rows.filter((row): row is [string, string] => Boolean(row[1]));
  if (!shown.length) return null;
  return (
    <dl className="grid gap-x-6 gap-y-1.5 rounded-lg border border-border bg-surface-1/60 p-3 text-xs sm:grid-cols-2">
      {shown.map(([label, value]) => (
        <div className="min-w-0" key={label}>
          <dt className="font-semibold uppercase tracking-[0.02em] text-muted">{label}</dt>
          <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function period(from: string | null, to: string | null) {
  if (from && to) return `${formatVietnamDateValue(from)} – ${formatVietnamDateValue(to)}`;
  if (from) return `Từ ${formatVietnamDateValue(from)}`;
  if (to) return `Đến ${formatVietnamDateValue(to)}`;
  return null;
}
