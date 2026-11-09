"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { CopyLeadersDialog } from "./copy-leaders-dialog";

// Khóa nguồn chọn được để sao chép danh sách tham dự (khớp CourseCopyModels.AnySource của BE).
export type CopySourceOption = {
  courseCode: string;
  courseName: string;
  hostYear: number | null;
  // null với khóa quá khứ (không có loại khóa).
  courseTypeName: string | null;
  pastCourse: boolean;
  startDate: string | null;
  endDate: string | null;
  ownerName: string | null;
  participantCount: number;
  passedCount: number;
};

export type CopyMode = "ALL" | "PASSED_ONLY";

const MODES: { value: CopyMode; label: string; hint: string }[] = [
  { value: "ALL", label: "Tất cả hồ sơ", hint: "Sao chép mọi hồ sơ trong danh sách tham dự của khóa nguồn" },
  { value: "PASSED_ONLY", label: "Chỉ hồ sơ có kết quả đạt", hint: "Bỏ qua hồ sơ không đạt hoặc chưa có kết quả" },
];

export function copyModeValue(value: unknown): CopyMode {
  return value === "PASSED_ONLY" ? "PASSED_ONLY" : "ALL";
}

export function selectedCodes(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

// Số hồ sơ tối đa sao chép được từ các khóa nguồn đã chọn (chưa trừ hồ sơ trùng giữa các khóa hoặc đã có trong khóa).
export function estimateCopyCount(sources: CopySourceOption[], selected: string[], mode: CopyMode) {
  return sources
    .filter((source) => selected.includes(source.courseCode))
    .reduce((total, source) => total + (mode === "PASSED_ONLY" ? source.passedCount : source.participantCount), 0);
}

// Số năm (tính từ năm tổ chức khóa đích trở về trước) của các khóa nguồn hiển thị mặc định.
export const SOURCE_YEAR_WINDOW = 2;

// Khóa nguồn hiển thị mặc định: tổ chức trong vòng 2 năm tính từ năm tổ chức khóa đích (năm đích - 2 đến năm đích).
export function inYearWindow(source: CopySourceOption, targetYear: number) {
  return source.hostYear !== null && source.hostYear !== undefined && source.hostYear >= targetYear - SOURCE_YEAR_WINDOW && source.hostYear <= targetYear;
}

export function targetYearOf(value: unknown) {
  const year = Number(value);
  return Number.isInteger(year) && year > 1900 ? year : new Date().getFullYear();
}

function matches(source: CopySourceOption, keyword: string) {
  if (!keyword) return true;
  const haystack = [source.courseName, source.hostYear, source.courseTypeName, source.pastCourse ? "khóa quá khứ" : "", source.ownerName].filter(Boolean).join(" ").toLowerCase();
  return keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => haystack.includes(part));
}

// Chọn khóa nguồn và chế độ sao chép danh sách tham dự ngay trong form tạo / sửa khóa; việc sao chép chạy khi bấm lưu khóa.
// Sửa khóa truyền courseCode; tạo khóa truyền courseTypeCode (phạm vi nguồn theo cấp quản lý của loại khóa).
export function CourseCopySourcesField({
  courseCode,
  courseTypeCode,
  selected,
  mode,
  targetYear,
  leaderIds,
  onSelectedChange,
  onModeChange,
  onLeaderIdsChange,
  readonly,
}: {
  courseCode?: string;
  courseTypeCode?: string;
  selected: string[];
  mode: CopyMode;
  // Năm tổ chức của khóa đích: mặc định chỉ hiện khóa nguồn trong vòng 2 năm tính từ năm này.
  targetYear: number;
  // Danh sách huynh trưởng được chọn riêng (undefined = chưa chọn riêng, sao chép theo cách đã chọn).
  leaderIds?: string[];
  onSelectedChange: (codes: string[]) => void;
  onModeChange: (mode: CopyMode) => void;
  onLeaderIdsChange: (ids: string[] | undefined) => void;
  readonly?: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const [leadersOpen, setLeadersOpen] = useState(false);
  const picked = leaderIds !== undefined;
  const scopeKey = courseCode || courseTypeCode || "";
  const query = useQuery({
    queryKey: ["course-copy-sources", scopeKey],
    enabled: Boolean(scopeKey),
    queryFn: () => {
      const params = new URLSearchParams();
      if (courseCode) params.set("courseCode", courseCode);
      else if (courseTypeCode) params.set("courseTypeCode", courseTypeCode);
      return apiFetch<CopySourceOption[]>(`/training/courses/copy-sources?${params.toString()}`);
    },
  });
  const sources = useMemo(() => query.data ?? [], [query.data]);
  const searching = keyword.trim() !== "";
  // Không tìm kiếm: chỉ hiện khóa trong vòng 2 năm (khóa đã chọn luôn hiện); có tìm kiếm: tìm trong mọi khóa nguồn.
  const visible = useMemo(
    () => sources.filter((source) => (searching ? matches(source, keyword.trim()) : inYearWindow(source, targetYear) || selected.includes(source.courseCode))),
    [sources, keyword, searching, targetYear, selected],
  );
  const hiddenCount = sources.length - visible.length;
  const estimate = estimateCopyCount(sources, selected, mode);

  function toggle(code: string) {
    onSelectedChange(selected.includes(code) ? selected.filter((item) => item !== code) : [...selected, code]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
        Cách sao chép
        <HelpTip>
          <strong>Tất cả hồ sơ</strong>: sao chép mọi huynh trưởng trong danh sách tham dự của khóa nguồn. <strong>Chỉ hồ sơ có kết quả đạt</strong>: bỏ qua người không đạt hoặc chưa có kết quả. Muốn chọn từng người, dùng nút “Chọn hồ sơ cụ thể” bên dưới.
        </HelpTip>
      </div>
      <div aria-label="Chế độ sao chép" className="grid gap-2 sm:grid-cols-2" role="radiogroup">
        {MODES.map((option) => {
          const checked = mode === option.value;
          return (
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                checked ? "border-primary bg-primary-soft/40" : "border-border hover:bg-surface-1",
                (readonly || picked) && "cursor-not-allowed opacity-60",
              )}
              key={option.value}
            >
              <input checked={checked} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" disabled={readonly || picked} name="copy-mode" onChange={() => onModeChange(option.value)} type="radio" />
              <span className="min-w-0">
                <span className="block break-words text-sm font-semibold text-foreground">{option.label}</span>
                <span className="block break-words text-xs text-muted">{option.hint}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="relative">
        <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
        <Input
          aria-label="Tìm khóa nguồn"
          className="h-9 pl-9"
          disabled={readonly || sources.length === 0}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm theo tên khóa, năm tổ chức hoặc loại khóa"
          value={keyword}
        />
      </div>

      {query.isLoading ? (
        <div className="h-24 animate-pulse rounded-lg bg-surface-1" />
      ) : query.isError ? (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{getApiErrorMessage(query.error)}</p>
      ) : sources.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted">Chưa có khóa nào đã kết thúc hoặc khóa quá khứ trong phạm vi để sao chép.</p>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted">
          {searching ? "Không có khóa nào khớp từ khóa tìm kiếm." : `Không có khóa nào tổ chức từ năm ${targetYear - SOURCE_YEAR_WINDOW} đến năm ${targetYear}. Gõ tên khóa vào ô tìm kiếm để xem các khóa khác.`}
        </p>
      ) : (
        <ul className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {visible.map((source) => {
            const checked = selected.includes(source.courseCode);
            return (
              <li className="min-w-0" key={source.courseCode}>
                <label
                  className={cn(
                    "flex h-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    checked ? "border-primary bg-primary-soft/40" : "border-border hover:bg-surface-1",
                    readonly && "cursor-not-allowed opacity-60",
                  )}
                >
                  <input checked={checked} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" disabled={readonly} onChange={() => toggle(source.courseCode)} type="checkbox" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold leading-5 text-foreground">{source.courseName}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {source.hostYear ? <Tag>Năm tổ chức {source.hostYear}</Tag> : null}
                      <Tag tone={source.pastCourse ? "warning" : "primary"}>{source.pastCourse ? "Khóa quá khứ" : (source.courseTypeName ?? "Khóa thường")}</Tag>
                      {source.ownerName ? <Tag>{source.ownerName}</Tag> : null}
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
      )}

      {!searching && hiddenCount > 0 ? (
        <p className="break-words text-xs leading-5 text-muted">
          Đang hiện các khóa tổ chức từ năm {targetYear - SOURCE_YEAR_WINDOW} đến năm {targetYear}; còn {hiddenCount} khóa khác. Gõ tên khóa vào ô tìm kiếm để xem.
        </p>
      ) : null}

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2">
          <span className="min-w-0 flex-1 text-sm text-foreground">
            {picked ? (
              <>
                Đã chọn riêng <strong>{leaderIds?.length ?? 0}</strong> hồ sơ huynh trưởng để sao chép.
              </>
            ) : (
              "Chưa chọn riêng: sao chép theo cách đã chọn ở trên."
            )}
          </span>
          <HelpTip>Mở danh sách huynh trưởng của các khóa nguồn đã chọn để tích chọn từng người cần sao chép (ví dụ khóa nguồn có 3 huynh trưởng thì chỉ chọn 1–2 người). Khi đã chọn riêng, cách sao chép ở trên không còn áp dụng.</HelpTip>
          <Button disabled={readonly} onClick={() => setLeadersOpen(true)} size="sm" type="button" variant="outline">
            {picked ? "Sửa hồ sơ đã chọn" : "Chọn hồ sơ cụ thể"}
          </Button>
          {picked ? (
            <Button disabled={readonly} onClick={() => onLeaderIdsChange(undefined)} size="sm" type="button" variant="ghost">
              Bỏ chọn riêng
            </Button>
          ) : null}
        </div>
      ) : null}
      {leadersOpen ? (
        <CopyLeadersDialog
          courseCode={courseCode}
          courseTypeCode={courseTypeCode}
          initialSelection={leaderIds}
          onClose={() => setLeadersOpen(false)}
          onConfirm={(ids) => {
            onLeaderIdsChange(ids);
            setLeadersOpen(false);
          }}
          open
          passedOnly={mode === "PASSED_ONLY"}
          sourceCourseCodes={selected}
        />
      ) : null}

      <p className="break-words text-xs leading-5 text-muted">
        {selected.length > 0
          ? picked
            ? `Đã chọn ${selected.length} khóa nguồn, ${leaderIds?.length ?? 0} hồ sơ chọn riêng sẽ được sao chép vào danh sách tham dự khi bấm lưu. `
            : `Đã chọn ${selected.length} khóa nguồn, tối đa ${estimate} hồ sơ sẽ được sao chép vào danh sách tham dự khi bấm lưu. `
          : "Không chọn khóa nguồn thì không sao chép. "}
        Hồ sơ trùng giữa các khóa, đã có trong khóa hoặc không sao chép được (huynh trưởng ngưng hoạt động, giáo xứ bị khóa, ngoài phạm vi khóa) sẽ tự bỏ qua; hồ sơ sao chép vào thẳng danh sách tham dự (đã duyệt).
      </p>
    </div>
  );
}

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "primary" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-block max-w-full break-words rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4",
        tone === "primary" && "bg-primary-soft text-primary",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "neutral" && "bg-surface-2 text-text-secondary",
      )}
    >
      {children}
    </span>
  );
}
