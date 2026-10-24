"use client";

import { useQuery } from "@tanstack/react-query";
import { formatVietnamDateValue } from "@/lib/date-format";
import { apiFetch } from "@/lib/api/client";
import { leaderLevelName } from "@/modules/leader-levels/leader-level-store";
import { CourseConditionList, courseConditionItems } from "@/modules/training-courses/components/course-conditions";

export type ExceptionReviewTarget = {
  leaderId: string;
  courseCode: string;
  holyName?: string;
  fullName?: string;
  parishName?: string;
  deaneryName?: string;
  leaderLevel?: string;
};

type LeaderInfo = { birthDate?: string | null; leaderLevel?: string | null };
type RankHistoryItem = { id?: number; oldLevel?: string | null; newLevel?: string | null; promotionDate?: string | null; note?: string | null };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="break-words text-sm font-medium text-foreground">{value || "Chưa có"}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-white p-3">
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.02em] text-text-secondary">{title}</h3>
      {children}
    </section>
  );
}

// Cột trái của hộp thoại duyệt ngoại lệ: hồ sơ huynh trưởng và lịch sử cấp độ.
export function ExceptionProfilePanel({ target }: { target: ExceptionReviewTarget }) {
  const leaderQuery = useQuery({
    queryKey: ["resource-detail", "/leaders", target.leaderId],
    queryFn: () => apiFetch<LeaderInfo>(`/leaders/${encodeURIComponent(target.leaderId)}`),
    staleTime: 60_000,
  });
  const historyQuery = useQuery({
    queryKey: ["leader-rank-history-page", target.leaderId],
    queryFn: () => apiFetch<RankHistoryItem[]>(`/leaders/${encodeURIComponent(target.leaderId)}/rank-history`),
    staleTime: 60_000,
  });
  const birth = formatVietnamDateValue(leaderQuery.data?.birthDate ?? null) ?? "";
  const levelCode = leaderQuery.data?.leaderLevel ?? target.leaderLevel;
  const history = [...(historyQuery.data ?? [])].sort((a, b) => String(b.promotionDate ?? "").localeCompare(String(a.promotionDate ?? "")));

  return (
    <div className="min-w-0 space-y-3">
      <Group title="Hồ sơ huynh trưởng">
        <p className="mb-3 text-base font-semibold text-foreground">{[target.holyName, target.fullName].filter(Boolean).join(" ") || "Chưa có tên"}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <Field label="Ngày sinh" value={birth} />
          <Field label="Cấp độ hiện tại" value={levelCode ? leaderLevelName(levelCode) : ""} />
          <Field label="Giáo xứ" value={target.parishName ?? ""} />
          <Field label="Giáo hạt" value={target.deaneryName ?? ""} />
        </dl>
      </Group>
      <Group title="Lịch sử cấp độ">
        {historyQuery.isLoading ? (
          <p className="text-[13px] text-muted">Đang tải...</p>
        ) : history.length === 0 ? (
          <p className="text-[13px] text-muted">Chưa có lịch sử cấp độ.</p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto border-l border-border pl-3">
            {history.map((item, index) => (
              <li className="text-[13px]" key={item.id ?? index}>
                <p className="font-medium text-foreground">
                  {item.oldLevel ? `${leaderLevelName(item.oldLevel)} → ` : ""}
                  {leaderLevelName(item.newLevel) || "Chưa có"}
                </p>
                <p className="text-xs text-muted">
                  {formatVietnamDateValue(item.promotionDate ?? null) ?? "Chưa rõ ngày"}
                  {item.note ? ` · ${item.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Group>
    </div>
  );
}

// Điều kiện của khóa để người duyệt đối chiếu với hồ sơ.
export function ExceptionCourseConditions({ courseCode }: { courseCode: string }) {
  const courseQuery = useQuery({
    queryKey: ["resource-detail", "/training/courses", courseCode],
    queryFn: () => apiFetch<Record<string, unknown>>(`/training/courses/${encodeURIComponent(courseCode)}`),
    staleTime: 60_000,
  });
  const conditions = courseConditionItems(courseQuery.data);
  return (
    <Group title="Điều kiện của khóa">
      {courseQuery.isLoading ? (
        <p className="text-[13px] text-muted">Đang tải...</p>
      ) : conditions.length > 0 ? (
        <CourseConditionList className="flex-col gap-y-1.5" items={conditions} />
      ) : (
        <p className="text-[13px] text-muted">Khóa không đặt điều kiện tham dự.</p>
      )}
    </Group>
  );
}
