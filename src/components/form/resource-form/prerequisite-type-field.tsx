"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, Check, Info, MagnifyingGlass, Users, Warning, X } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { normalizeSearchText } from "@/lib/search-text";
import { cn } from "@/lib/utils";

export type CourseLevel = "DIOCESE" | "DEANERY";
export type LevelFilter = "ALL" | CourseLevel;

export type PrerequisiteOption = {
  typeCode: string;
  typeName: string;
  managementUnitType: CourseLevel;
  // DEANERY: do giáo hạt tự tạo; DIOCESE: của giáo phận (cấp giáo hạt thì dùng chung cho mọi giáo hạt).
  ownerUnitType?: CourseLevel;
  status?: boolean;
  requiredCurrentLevelName?: string | null;
  resultingLevelName?: string | null;
  prerequisiteTypeName?: string | null;
  courseCount: number;
  completedLeaderCount: number;
  current?: boolean;
  selectable: boolean;
  disabledReason?: string | null;
};

export const LEVEL_LABELS: Record<CourseLevel, string> = { DIOCESE: "Cấp giáo phận", DEANERY: "Cấp giáo hạt" };

// Thế nào là đã hoàn thành khóa tiên quyết (BE dùng cùng quy tắc cho điều kiện tham dự và số huynh trưởng đã hoàn thành).
export const PASS_RULE_TEXT =
  "Loại khóa có cấp chứng nhận tính theo chứng nhận được duyệt; loại khóa không cấp chứng nhận tính theo kết quả khóa (đạt).";

// Danh sách loại khóa chọn được làm khóa tiên quyết (BE lọc theo quy tắc cấp, loại khóa đang sửa và vòng lặp).
export function prerequisiteOptionsEndpoint(ownerLevel: CourseLevel, forTypeCode?: string) {
  const params = new URLSearchParams({ managementUnitType: ownerLevel });
  if (forTypeCode) params.set("forTypeCode", forTypeCode);
  return `/training/course-types/prerequisite-options?${params.toString()}`;
}

export function filterPrerequisiteOptions(options: PrerequisiteOption[], filter: { keyword: string; level: LevelFilter; onlyWithGraduates: boolean }) {
  const parts = normalizeSearchText(filter.keyword.trim()).split(/\s+/).filter(Boolean);
  return options.filter((option) => {
    if (filter.level !== "ALL" && option.managementUnitType !== filter.level) return false;
    if (filter.onlyWithGraduates && option.completedLeaderCount <= 0 && !option.current) return false;
    if (!parts.length) return true;
    const haystack = normalizeSearchText([option.typeName, option.requiredCurrentLevelName, option.resultingLevelName, option.prerequisiteTypeName].filter(Boolean).join(" "));
    return parts.every((part) => haystack.includes(part));
  });
}

// Nhóm theo cấp: cấp giáo phận trước, cấp giáo hạt sau; nhóm rỗng bị bỏ.
export function groupByLevel(options: PrerequisiteOption[]) {
  return (["DIOCESE", "DEANERY"] as const)
    .map((level) => ({ level, items: options.filter((option) => option.managementUnitType === level) }))
    .filter((group) => group.items.length > 0);
}

function OwnerTag({ option }: { option: Pick<PrerequisiteOption, "managementUnitType" | "ownerUnitType"> }) {
  if (option.managementUnitType !== "DEANERY") return null;
  const own = option.ownerUnitType === "DEANERY";
  return <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary">{own ? "Giáo hạt tự tạo" : "Dùng chung"}</span>;
}

function LevelBadge({ level }: { level: CourseLevel }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
        level === "DEANERY" ? "bg-sky-100 text-sky-800" : "bg-violet-100 text-violet-800",
      )}
    >
      {level === "DEANERY" ? "Giáo hạt" : "Giáo phận"}
    </span>
  );
}

function levelPath(option: Pick<PrerequisiteOption, "requiredCurrentLevelName" | "resultingLevelName">) {
  const from = option.requiredCurrentLevelName?.trim();
  const to = option.resultingLevelName?.trim();
  if (from && to) return `Yêu cầu ${from} → đạt ${to}`;
  if (to) return `Hoàn thành đạt ${to}`;
  if (from) return `Yêu cầu ${from}`;
  return "";
}

function OptionStats({ option }: { option: PrerequisiteOption }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
      <span className="inline-flex items-center gap-1">
        <Users aria-hidden size={13} />
        <span className="font-semibold text-foreground">{option.completedLeaderCount}</span> huynh trưởng đã hoàn thành
      </span>
      <span className="inline-flex items-center gap-1">
        <BookOpen aria-hidden size={13} />
        <span className="font-semibold text-foreground">{option.courseCount}</span> khóa đã tạo
      </span>
    </span>
  );
}

// Ô chọn khóa tiên quyết của loại khóa: hiện thẻ tóm tắt khóa đang chọn, bấm để mở hộp thoại tìm / lọc theo cấp.
export function PrerequisiteTypeField({
  id,
  value,
  ownerLevel,
  forTypeCode,
  currentName,
  currentLevel,
  currentOwnedByDeanery,
  readonly,
  onChange,
  onClear,
}: {
  id?: string;
  value: string;
  // Cấp quản lý của loại khóa đang tạo / sửa (chưa chọn thì chưa mở được danh sách).
  ownerLevel?: CourseLevel;
  forTypeCode?: string;
  // Tên / cấp của khóa tiên quyết đang lưu, dùng khi danh sách chưa tải xong.
  currentName?: string;
  currentLevel?: CourseLevel;
  currentOwnedByDeanery?: boolean;
  readonly?: boolean;
  onChange: (typeCode: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["course-type-prerequisite-options", ownerLevel ?? "", forTypeCode ?? ""],
    enabled: Boolean(ownerLevel),
    queryFn: () => apiFetch<PrerequisiteOption[]>(prerequisiteOptionsEndpoint(ownerLevel as CourseLevel, forTypeCode)),
  });
  const options = useMemo(() => query.data ?? [], [query.data]);
  const selected = options.find((option) => option.typeCode === value);

  // Đổi cấp quản lý (vd. sang giáo hạt) mà khóa đang chọn không còn hợp lệ thì bỏ chọn và báo cho người dùng.
  const invalid = Boolean(value && query.data && !query.isFetching && !query.data.some((option) => option.typeCode === value));
  const [dropped, setDropped] = useState<{ code: string; name: string } | null>(null);
  if (invalid && dropped?.code !== value) {
    setDropped({ code: value, name: currentName || "đang chọn" });
  }
  useEffect(() => {
    if (invalid) onClear();
  }, [invalid, onClear]);
  const notice = dropped && !value
    ? `Đã bỏ khóa tiên quyết "${dropped.name}" vì không hợp lệ với ${ownerLevel === "DEANERY" ? "loại khóa cấp giáo hạt" : "cấp quản lý đang chọn"}.`
    : "";
  const dismissNotice = () => setDropped(null);

  const name = selected?.typeName ?? currentName ?? "";
  const level = selected?.managementUnitType ?? currentLevel;

  return (
    <div className="space-y-1.5">
      {value ? (
        <div className="rounded-[8px] border border-primary/40 bg-primary/5 px-3 py-2.5" id={id}>
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {level ? <LevelBadge level={level} /> : null}
                {level ? <OwnerTag option={{ managementUnitType: level, ownerUnitType: selected ? selected.ownerUnitType : currentOwnedByDeanery ? "DEANERY" : "DIOCESE" }} /> : null}
                <span className="break-words text-sm font-semibold text-foreground">{name || "Đang tải..."}</span>
                {selected && selected.status === false ? <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary">Ngừng hoạt động</span> : null}
              </div>
              {selected && levelPath(selected) ? <p className="mt-0.5 text-xs text-text-secondary">{levelPath(selected)}</p> : null}
              {selected ? <div className="mt-1"><OptionStats option={selected} /></div> : null}
            </div>
            {!readonly ? (
              <div className="flex shrink-0 gap-1.5">
                <Button disabled={!ownerLevel} onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
                  Đổi
                </Button>
                <Button aria-label="Bỏ khóa tiên quyết" onClick={() => { dismissNotice(); onClear(); }} size="sm" type="button" variant="ghost">
                  Bỏ chọn
                </Button>
              </div>
            ) : null}
          </div>
          {level === "DEANERY" && !(selected ? selected.ownerUnitType === "DEANERY" : currentOwnedByDeanery) ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-text-secondary">
              <Info aria-hidden className="mt-0.5 shrink-0 text-primary" size={14} />
              Huynh trưởng đã hoàn thành khóa thuộc loại này ở bất kỳ giáo hạt nào trong giáo phận đều được tính.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-[8px] border border-dashed border-border bg-white px-3 py-2.5" id={id}>
          <p className="min-w-0 flex-1 text-sm text-muted">
            {ownerLevel ? "Không có khóa tiên quyết: huynh trưởng không cần đạt khóa nào trước." : "Chọn cấp quản lý trước để chọn khóa tiên quyết."}
          </p>
          {!readonly ? (
            <Button disabled={!ownerLevel} onClick={() => { dismissNotice(); setOpen(true); }} size="sm" type="button" variant="outline">
              Chọn khóa tiên quyết
            </Button>
          ) : null}
        </div>
      )}
      {notice ? (
        <p className="flex items-start gap-1.5 text-xs font-medium text-warning">
          <Warning aria-hidden className="mt-0.5 shrink-0" size={14} />
          {notice}
        </p>
      ) : null}
      {open && ownerLevel ? (
        <PrerequisitePickerDialog
          error={query.isError ? getApiErrorMessage(query.error) : ""}
          loading={query.isLoading}
          onClose={() => setOpen(false)}
          onConfirm={(code) => {
            dismissNotice();
            onChange(code);
            setOpen(false);
          }}
          options={options}
          ownerLevel={ownerLevel}
          value={value}
        />
      ) : null}
    </div>
  );
}

function PrerequisitePickerDialog({
  options,
  value,
  ownerLevel,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  options: PrerequisiteOption[];
  value: string;
  ownerLevel: CourseLevel;
  loading: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (typeCode: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [level, setLevel] = useState<LevelFilter>("ALL");
  const [onlyWithGraduates, setOnlyWithGraduates] = useState(false);
  const [picked, setPicked] = useState(value);
  const visible = useMemo(() => filterPrerequisiteOptions(options, { keyword, level, onlyWithGraduates }), [options, keyword, level, onlyWithGraduates]);
  const groups = groupByLevel(visible);
  const showLevelFilter = ownerLevel === "DIOCESE";
  const countOf = (target: LevelFilter) => (target === "ALL" ? options.length : options.filter((option) => option.managementUnitType === target).length);
  const pickedOption = options.find((option) => option.typeCode === picked);

  return (
    <Dialog.Root open onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-32px)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white p-5 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold text-foreground">Chọn khóa tiên quyết</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                {ownerLevel === "DIOCESE"
                  ? "Huynh trưởng phải hoàn thành một khóa thuộc loại được chọn trước khi tham dự. Chọn được loại khóa cấp giáo phận hoặc loại cấp giáo hạt do giáo phận tạo (dùng chung); khóa tổ chức ở giáo hạt nào cũng được tính. Loại khóa do giáo hạt tự tạo không chọn được."
                  : "Huynh trưởng phải hoàn thành một khóa thuộc loại được chọn trước khi tham dự. Chọn được loại cấp giáo hạt do giáo phận tạo (dùng chung) hoặc do giáo hạt bạn tự tạo."}{" "}
                {PASS_RULE_TEXT}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="icon">
                <X size={16} />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="relative">
              <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <Input aria-label="Tìm loại khóa" autoFocus className="h-9 pl-9" onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo tên loại khóa hoặc cấp độ" value={keyword} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {showLevelFilter ? (
                <div aria-label="Lọc theo cấp quản lý" className="grid w-full grid-cols-3 rounded-lg border border-border bg-surface-1 p-0.5 sm:inline-grid sm:w-auto" role="radiogroup">
                  {(["ALL", "DIOCESE", "DEANERY"] as const).map((item) => (
                    <button
                      aria-checked={level === item}
                      aria-label={`${item === "ALL" ? "Tất cả" : LEVEL_LABELS[item]} (${countOf(item)})`}
                      className={cn(
                        "h-8 cursor-pointer whitespace-nowrap rounded-md px-2 text-[13px] font-semibold transition-colors sm:px-3",
                        level === item ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground",
                      )}
                      key={item}
                      onClick={() => setLevel(item)}
                      role="radio"
                      type="button"
                    >
                      {item === "ALL" ? "Tất cả" : item === "DIOCESE" ? "Giáo phận" : "Giáo hạt"} <span className="font-normal text-muted">({countOf(item)})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <span />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-text-secondary">
                <input checked={onlyWithGraduates} className="h-4 w-4 accent-primary" onChange={(event) => setOnlyWithGraduates(event.target.checked)} type="checkbox" />
                Chỉ loại khóa đã có huynh trưởng hoàn thành
              </label>
            </div>
          </div>

          <div className="mt-3 min-h-[160px] flex-1 overflow-y-auto rounded-lg border border-border" role="radiogroup" aria-label="Loại khóa">
            {loading ? (
              <div className="h-40 animate-pulse bg-surface-1" />
            ) : error ? (
              <p className="px-3 py-4 text-sm text-danger">{error}</p>
            ) : options.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">Chưa có loại khóa nào chọn được làm khóa tiên quyết.</p>
            ) : visible.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">Không có loại khóa nào khớp bộ lọc.</p>
            ) : (
              groups.map((group) => (
                <section key={group.level}>
                  <h3 className="sticky top-0 z-[1] border-b border-border bg-surface-1 px-3 py-1.5 text-xs font-semibold uppercase text-text-secondary">
                    {LEVEL_LABELS[group.level]} · {group.items.length}
                  </h3>
                  <ul className="divide-y divide-border">
                    {group.items.map((option) => {
                      const active = picked === option.typeCode;
                      const disabled = !option.selectable;
                      return (
                        <li key={option.typeCode}>
                          <button
                            aria-checked={active}
                            className={cn(
                              "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
                              disabled ? "cursor-not-allowed bg-surface-1 opacity-70" : "cursor-pointer hover:bg-surface-1",
                              active && "bg-primary/8 hover:bg-primary/10",
                            )}
                            disabled={disabled}
                            onClick={() => setPicked(option.typeCode)}
                            onDoubleClick={() => !disabled && onConfirm(option.typeCode)}
                            role="radio"
                            type="button"
                          >
                            <span
                              aria-hidden
                              className={cn(
                                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                active ? "border-primary bg-primary text-white" : "border-input bg-white",
                              )}
                            >
                              {active ? <Check size={10} weight="bold" /> : null}
                            </span>
                            <span className="min-w-0 flex-1 space-y-0.5">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="break-words text-sm font-semibold text-foreground">{option.typeName}</span>
                                <LevelBadge level={option.managementUnitType} />
                                <OwnerTag option={option} />
                                {option.current ? <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">Đang dùng</span> : null}
                                {option.status === false ? <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary">Ngừng hoạt động</span> : null}
                              </span>
                              {levelPath(option) ? <span className="block text-xs text-text-secondary">{levelPath(option)}</span> : null}
                              {option.prerequisiteTypeName ? <span className="block text-xs text-muted">Loại khóa này cần đạt trước: {option.prerequisiteTypeName}</span> : null}
                              <OptionStats option={option} />
                              {disabled && option.disabledReason ? <span className="block text-xs font-medium text-warning">Không chọn được: {option.disabledReason}</span> : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-sm text-text-secondary">
              {pickedOption ? (
                <>
                  Đã chọn: <span className="font-semibold text-foreground">{pickedOption.typeName}</span>
                </>
              ) : (
                "Chưa chọn loại khóa nào"
              )}
            </p>
            <div className="flex gap-2">
              <Button onClick={onClose} type="button" variant="outline">
                Hủy
              </Button>
              <Button disabled={!pickedOption || !pickedOption.selectable} onClick={() => pickedOption && onConfirm(pickedOption.typeCode)} type="button">
                Chọn khóa này
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
