"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import { serializeBaseSearch } from "@/lib/api/search";
import { cn } from "@/lib/utils";
import { originalScore, type ScoreComponent, type ScoreDrafts } from "./score-entry";

type Tone = "success" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-[color-mix(in_oklab,var(--warning)_70%,black)]",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

// Lấy hết hồ sơ tham dự của khóa (nhiều trang) để thống kê đúng cho cả danh sách, không chỉ trang đang xem.
async function fetchAllParticipants(endpoint: string, courseCode: string) {
  const rows: Record<string, unknown>[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await apiFetch<PageResponse<Record<string, unknown>>>(
      `${endpoint}?${serializeBaseSearch({ page, size: PAGE_SIZE, filters: { "course.courseCode": courseCode } }).toString()}`,
    );
    rows.push(...(response.content ?? []));
    if (response.last || (response.content ?? []).length === 0) break;
  }
  return rows;
}

// Thống kê nhập điểm của khóa: bao nhiêu người chưa nhập đủ điểm và từng cột điểm còn thiếu bao nhiêu người.
// Tính cả điểm đang nhập chưa lưu, nên số liệu giảm ngay khi người dùng điền.
export function ScoreStats({
  endpoint,
  courseCode,
  components,
  drafts,
}: {
  endpoint: string;
  courseCode: string;
  components: ScoreComponent[];
  drafts: ScoreDrafts;
}) {
  const query = useQuery({
    // Bắt đầu bằng "resource" để được làm mới cùng danh sách sau khi lưu điểm.
    queryKey: ["resource", endpoint, "score-stats", courseCode],
    queryFn: () => fetchAllParticipants(endpoint, courseCode),
  });

  if (query.isLoading) {
    return <div className="h-9 w-72 rounded-lg bg-surface-2 motion-safe:animate-pulse" />;
  }
  if (query.isError || !query.data) return null;

  // Hồ sơ hủy không phải nhập điểm.
  const rows = query.data.filter((row) => row.participationStatus !== "CANCELLED");
  const entered = (row: Record<string, unknown>, componentId: string) => {
    const id = String(row.id ?? "");
    const value = drafts[id]?.values[componentId] ?? originalScore(row, componentId);
    return value.trim() !== "";
  };
  const missingByComponent = components.map((component) => ({
    component,
    missing: rows.filter((row) => !entered(row, component.id)).length,
  }));
  const missingPeople = rows.filter((row) => components.some((component) => !entered(row, component.id))).length;
  const total = rows.length;

  return (
    <div aria-label="Thống kê nhập điểm" className="flex flex-wrap items-center gap-2" role="group">
      <Chip tone={missingPeople === 0 ? "success" : missingPeople === total ? "danger" : "warning"}>
        <span className="font-medium">Chưa nhập đủ điểm</span>
        <span className="text-sm font-bold">{missingPeople}</span>
        <span className="font-medium opacity-80">/ {total} người</span>
      </Chip>
      {missingByComponent.map(({ component, missing }) => (
        <Chip key={component.id} tone={missing === 0 ? "success" : missing === total ? "danger" : "warning"}>
          <span className="max-w-40 truncate font-medium" title={component.name}>
            {component.name}
          </span>
          <span className="text-sm font-bold">{missing === 0 ? "Đủ" : `Thiếu ${missing}`}</span>
        </Chip>
      ))}
    </div>
  );
}

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1 text-xs", toneClass[tone])}>{children}</span>;
}
