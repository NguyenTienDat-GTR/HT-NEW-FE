"use client";

import { formatVietnamDateValue } from "@/lib/date-format";
import type { CopySourceCourse } from "../types";

// Chọn một hoặc nhiều khóa tiên quyết đã kết thúc làm nguồn sao chép.
export function SourceCoursePicker({ sources, selected, onChange }: { sources: CopySourceCourse[]; selected: string[]; onChange: (codes: string[]) => void }) {
  function toggle(code: string) {
    onChange(selected.includes(code) ? selected.filter((item) => item !== code) : [...selected, code]);
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {sources.map((source) => {
        const checked = selected.includes(source.courseCode);
        const start = formatVietnamDateValue(source.startDate);
        const end = formatVietnamDateValue(source.endDate);
        return (
          <li key={source.courseCode}>
            <label
              className={`flex h-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${checked ? "border-primary bg-primary-soft/40" : "border-border hover:bg-surface-1"}`}
            >
              <input checked={checked} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" onChange={() => toggle(source.courseCode)} type="checkbox" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{source.courseName}</span>
                <span className="block text-xs text-muted">
                  {[source.ownerName, start || end ? `${start ?? "…"} → ${end ?? "…"}` : null].filter(Boolean).join(" · ")}
                </span>
                <span className="mt-1 block text-xs text-text-secondary">
                  {source.participantCount} hồ sơ tham dự · <span className="font-semibold text-success">{source.passedCount} đạt</span>
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
