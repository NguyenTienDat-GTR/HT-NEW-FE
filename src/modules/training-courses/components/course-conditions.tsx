"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export type CourseConditionItem = { label: string; value: string };

// Điều kiện tham dự của khóa (lấy từ loại khóa và số năm hoạt động của khóa), bỏ qua điều kiện không đặt.
export function courseConditionItems(course: Record<string, unknown> | null | undefined): CourseConditionItem[] {
  if (!course || course.pastCourse === true) return [];
  const items: CourseConditionItem[] = [];
  const level = typeof course.requiredCurrentLevelName === "string" ? course.requiredCurrentLevelName : "";
  if (level) items.push({ label: "Cấp độ hiện tại", value: level });
  const minAge = Number(course.requiredMinAge);
  if (course.requiredMinAge != null && Number.isFinite(minAge) && minAge > 0) items.push({ label: "Tuổi tối thiểu", value: `${minAge} tuổi` });
  const prerequisite = typeof course.prerequisiteTypeName === "string" ? course.prerequisiteTypeName : "";
  if (prerequisite) {
    items.push({ label: "Khóa tiên quyết", value: `Đã đạt ${prerequisite}` });
    const years = Number(course.yearsActive);
    if (Number.isFinite(years) && years > 0) items.push({ label: "Số năm hoạt động", value: `Cách lần đạt được cấp độ ${level || prerequisite} ${years} năm` });
    const maxYears = Number(course.maxYearsAfterPrerequisite);
    if (course.maxYearsAfterPrerequisite != null && Number.isFinite(maxYears) && maxYears > 0) items.push({ label: "Thời hạn tham dự", value: `Tối đa ${maxYears} năm kể từ lần đạt khóa tiên quyết gần nhất` });
  }
  return items;
}

export function CourseConditionList({ items, className }: { items: CourseConditionItem[]; className?: string }) {
  return (
    <dl className={cn("flex flex-wrap gap-x-8 gap-y-1.5 text-[13px]", className)}>
      {items.map((item) => (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap" key={item.label}>
          <dt className="text-muted">{item.label}:</dt>
          <dd className="font-medium text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Khung điều kiện của khóa trong modal lập danh sách / thêm ngoại lệ: tự tải chi tiết khóa theo mã khóa.
export function CourseConditionsBox({ courseCode }: { courseCode: string }) {
  const query = useQuery({
    queryKey: ["resource-detail", "/training/courses", courseCode],
    enabled: Boolean(courseCode),
    queryFn: () => apiFetch<Record<string, unknown>>(`/training/courses/${encodeURIComponent(courseCode)}`),
    staleTime: 60_000,
  });
  if (query.isLoading || query.isError) return null;
  const items = courseConditionItems(query.data);
  const courseName = typeof query.data?.courseName === "string" ? query.data.courseName : courseCode;
  return (
    <div className="border-b border-border bg-surface-2 px-5 py-3">
      <p className="mb-1.5 text-xs font-semibold uppercase text-text-secondary">Điều kiện của khóa · {courseName}</p>
      {items.length > 0 ? <CourseConditionList items={items} /> : <p className="text-[13px] text-muted">Khóa không đặt điều kiện tham dự.</p>}
    </div>
  );
}
