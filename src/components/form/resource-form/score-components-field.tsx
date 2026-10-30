"use client";

import { ArrowDown, ArrowUp, Copy, Plus, Trash } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import { serializeBaseSearch } from "@/lib/api/search";

// Một thành phần điểm khai báo ngay trong form khóa huấn luyện.
export type ScoreComponentRow = {
  id?: string;
  name: string;
  description?: string;
  maxScore: number | string;
  coefficient: number | string;
  includeInFinal: boolean;
  // Thành phần đã có điểm nhập trong khóa (chỉ từ BE): khóa việc thêm/xóa/đổi hệ số.
  hasScores?: boolean;
};

export const DEFAULT_SCORE_COMPONENT: ScoreComponentRow = { name: "", maxScore: 10, coefficient: 1, includeInFinal: true };

export function scoreComponentRows(value: unknown): ScoreComponentRow[] {
  return Array.isArray(value) ? (value as ScoreComponentRow[]) : [];
}

// Điểm tổng kết tối đa = trung bình có hệ số của điểm tối đa các thành phần tính vào tổng kết (null nếu chưa có).
export function maxFinalScore(rows: ScoreComponentRow[]): number | null {
  let weighted = 0;
  let coefficients = 0;
  rows.forEach((row) => {
    const max = Number(row.maxScore);
    const coefficient = Number(row.coefficient);
    if (row.includeInFinal && max > 0 && coefficient > 0) {
      weighted += max * coefficient;
      coefficients += coefficient;
    }
  });
  return coefficients > 0 ? Math.round((weighted / coefficients) * 100) / 100 : null;
}

export function scoreComponentsError(value: unknown): string | undefined {
  const rows = scoreComponentRows(value);
  if (rows.length === 0) return "Khóa phải có ít nhất một thành phần điểm";
  const names = new Set<string>();
  for (const row of rows) {
    const name = row.name.trim().toLowerCase();
    if (!name) return "Mỗi thành phần điểm phải có tên";
    if (names.has(name)) return `Tên thành phần điểm bị trùng: ${row.name.trim()}`;
    names.add(name);
    if (!(Number(row.maxScore) > 0)) return `Điểm tối đa của "${row.name.trim()}" phải lớn hơn 0`;
    if (!(Number(row.coefficient) > 0)) return `Hệ số của "${row.name.trim()}" phải lớn hơn 0`;
  }
  if (!rows.some((row) => row.includeInFinal)) return "Phải có ít nhất một thành phần được tính vào điểm tổng kết";
  return undefined;
}

// Chuẩn bị gửi BE: bỏ cờ chỉ dùng trên giao diện, đổi số dạng chuỗi sang số.
export function scoreComponentsPayload(value: unknown) {
  return scoreComponentRows(value).map((row) => ({
    id: row.id || undefined,
    name: row.name.trim(),
    description: row.description?.trim() || undefined,
    maxScore: Number(row.maxScore),
    coefficient: Number(row.coefficient),
    includeInFinal: row.includeInFinal,
  }));
}

type CourseOption = { courseCode: string; courseName?: string; hostYear?: number | null };

// Chọn một khóa cũ cùng loại khóa để sao chép thành phần điểm (tên, điểm tối đa, hệ số, cờ tính tổng kết); không sao chép id.
function CopyFromCourse({ courseTypeCode, excludeCourseCode, rows, onCopy }: { courseTypeCode: string; excludeCourseCode?: string; rows: ScoreComponentRow[]; onCopy: (rows: ScoreComponentRow[]) => void }) {
  const [selected, setSelected] = useState("");
  const [copying, setCopying] = useState(false);
  const courses = useQuery({
    queryKey: ["score-component-copy-sources", courseTypeCode],
    queryFn: () =>
      apiFetch<PageResponse<CourseOption>>(
        `/training/courses?${serializeBaseSearch({ page: 0, size: 100, sortBy: "hostYear", sortDirection: "DESC", filters: { "courseType.typeCode": courseTypeCode } }).toString()}`,
      ),
  });
  const options = (courses.data?.content ?? []).filter((course) => course.courseCode !== excludeCourseCode);

  async function copy() {
    if (!selected) return;
    const hasContent = rows.some((row) => row.name.trim());
    if (hasContent && !window.confirm("Thay toàn bộ thành phần điểm đang nhập bằng thành phần của khóa đã chọn?")) return;
    setCopying(true);
    try {
      const detail = await apiFetch<{ scoreComponents?: ScoreComponentRow[] }>(`/training/courses/${encodeURIComponent(selected)}`);
      const source = Array.isArray(detail.scoreComponents) ? detail.scoreComponents : [];
      if (source.length === 0) {
        toast.error("Khóa đã chọn chưa có thành phần điểm nào");
        return;
      }
      onCopy(source.map((item) => ({ name: item.name, description: item.description, maxScore: item.maxScore, coefficient: item.coefficient, includeInFinal: item.includeInFinal !== false })));
      toast.success(`Đã sao chép ${source.length} thành phần điểm`);
    } catch {
      toast.error("Không thể tải thành phần điểm của khóa đã chọn");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Chọn khóa cũ để sao chép thành phần điểm"
        className="h-8 min-w-[220px] max-w-full rounded-lg border border-input bg-white px-2 text-[13px] text-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]"
        disabled={courses.isLoading || options.length === 0}
        onChange={(event) => setSelected(event.target.value)}
        value={selected}
      >
        <option value="">{courses.isLoading ? "Đang tải..." : options.length === 0 ? "Chưa có khóa cùng loại để sao chép" : "Sao chép từ khóa cũ cùng loại..."}</option>
        {options.map((course) => (
          <option key={course.courseCode} value={course.courseCode}>
            {course.courseName}
            {course.hostYear ? ` (${course.hostYear})` : ""}
          </option>
        ))}
      </select>
      <Button disabled={!selected} loading={copying} onClick={copy} size="sm" type="button" variant="outline">
        <Copy size={14} />
        Sao chép
      </Button>
    </div>
  );
}

export function ScoreComponentsField({
  value,
  onChange,
  readonly,
  courseTypeCode,
  excludeCourseCode,
}: {
  value: unknown;
  onChange: (rows: ScoreComponentRow[]) => void;
  readonly?: boolean;
  courseTypeCode?: string;
  excludeCourseCode?: string;
}) {
  const rows = scoreComponentRows(value);
  // Khóa đã có điểm: chỉ đổi được tên; thêm/xóa/đổi điểm tối đa, hệ số, cách tính tổng kết bị chặn.
  const structureLocked = readonly || rows.some((row) => row.hasScores === true);
  const update = (index: number, patch: Partial<ScoreComponentRow>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {!structureLocked && courseTypeCode ? <CopyFromCourse courseTypeCode={courseTypeCode} excludeCourseCode={excludeCourseCode} onCopy={onChange} rows={rows} /> : null}
      <div className="overflow-x-auto rounded-[8px] border border-border">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="bg-surface-1 text-xs uppercase text-text-secondary">
            <tr>
              <th className="px-2 py-1.5 font-semibold">Tên thành phần</th>
              <th className="px-2 py-1.5 font-semibold">Điểm tối đa</th>
              <th className="px-2 py-1.5 font-semibold">Hệ số</th>
              <th className="px-2 py-1.5 font-semibold">Tính tổng kết</th>
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr className="border-t border-border" key={row.id ?? `new-${index}`}>
                <td className="px-2 py-1.5">
                  <Input aria-label={`Tên thành phần ${index + 1}`} className="h-8" disabled={readonly} onChange={(event) => update(index, { name: event.target.value })} placeholder="Ví dụ: Tinh thần" value={row.name} />
                </td>
                <td className="px-2 py-1.5">
                  <Input aria-label={`Điểm tối đa ${index + 1}`} className="h-8 w-24" disabled={structureLocked} inputMode="decimal" onChange={(event) => update(index, { maxScore: event.target.value })} value={String(row.maxScore)} />
                </td>
                <td className="px-2 py-1.5">
                  <Input aria-label={`Hệ số ${index + 1}`} className="h-8 w-24" disabled={structureLocked} inputMode="decimal" onChange={(event) => update(index, { coefficient: event.target.value })} value={String(row.coefficient)} />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    aria-label={`Tính vào điểm tổng kết ${index + 1}`}
                    checked={row.includeInFinal}
                    className="h-4 w-4 accent-primary"
                    disabled={structureLocked}
                    onChange={(event) => update(index, { includeInFinal: event.target.checked })}
                    type="checkbox"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex justify-end gap-1">
                    <Button aria-label="Chuyển lên" disabled={readonly || index === 0} onClick={() => move(index, -1)} size="sm" type="button" variant="ghost">
                      <ArrowUp size={14} />
                    </Button>
                    <Button aria-label="Chuyển xuống" disabled={readonly || index === rows.length - 1} onClick={() => move(index, 1)} size="sm" type="button" variant="ghost">
                      <ArrowDown size={14} />
                    </Button>
                    <Button aria-label="Xóa thành phần" disabled={structureLocked || rows.length <= 1} onClick={() => onChange(rows.filter((_, i) => i !== index))} size="sm" type="button" variant="ghost">
                      <Trash size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button disabled={structureLocked} onClick={() => onChange([...rows, { ...DEFAULT_SCORE_COMPONENT }])} size="sm" type="button" variant="outline">
        <Plus size={14} />
        Thêm thành phần
      </Button>
      {rows.some((row) => row.hasScores === true) ? (
        <p className="text-xs text-muted">Khóa đã có điểm được nhập nên chỉ đổi được tên thành phần và thứ tự; không thêm, xóa hoặc đổi điểm tối đa, hệ số, cách tính tổng kết.</p>
      ) : null}
    </div>
  );
}
