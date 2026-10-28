"use client";

import * as Popover from "@radix-ui/react-popover";
import { ArrowCounterClockwise, CalendarBlank, Check, FadersHorizontal, X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { genderOptions, groupByOptions, timeBucketOptions } from "@/modules/analytics/labels";
import { datePresets, presetLabel } from "@/modules/analytics/presets";
import { defaultFilters, type AnalyticsFilterState, type FilterOption, type FilterOptions, type ScopeOption, type ScopeType } from "@/modules/analytics/types";

export type FilterVisibility = {
  /** Bộ lọc theo khóa: loại khóa, khóa học. */
  course?: boolean;
  /** Bộ lọc theo nhân sự: cấp bậc, giới tính. */
  leader?: boolean;
  /** Bộ lọc theo đơn vị: giáo hạt, giáo xứ. */
  unit?: boolean;
  groupBy?: boolean;
  inactive?: boolean;
  /** Danh sách groupBy được phép theo tab hiện tại. */
  groupByValues?: string[];
};

type FilterBarProps = {
  filters: AnalyticsFilterState;
  onChange: (next: AnalyticsFilterState) => void;
  options?: FilterOptions;
  scope?: string;
  /** Các phạm vi tài khoản được xem; có từ hai phạm vi trở lên thì hiện bộ chọn phạm vi ở đầu thanh lọc. */
  scopes?: ScopeOption[];
  visible?: FilterVisibility;
  busy?: boolean;
  /** Kỳ BE thực sự đã tính, để người xem biết chính xác mốc ngày của số liệu. */
  appliedRange?: { fromDate: string; toDate: string; compareFromDate?: string | null; compareToDate?: string | null };
};

const fieldClass =
  "h-10 w-full cursor-pointer rounded-lg border border-input bg-white px-3 text-sm text-foreground transition-[border-color,box-shadow] duration-150 hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted";

function formatDate(value?: string | null) {
  if (!value) return "…";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function Select({ label, value, onChange, options, placeholder = "Tất cả", disabled }: { label: string; value: string; onChange: (value: string) => void; options: FilterOption[]; placeholder?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="mb-1 block text-xs font-medium text-text-secondary">{label}</span>
      <select className={fieldClass} disabled={disabled} id={id} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Segmented<T extends string>({ label, value, options, onChange, layoutId }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void; layoutId: string }) {
  return (
    <div aria-label={label} className="relative inline-flex h-10 items-center rounded-lg bg-surface-2 p-1" role="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            aria-checked={selected}
            className={cn("relative z-10 h-8 cursor-pointer rounded-md px-3 text-[13px] font-semibold transition-colors", selected ? "text-primary" : "text-text-secondary hover:text-foreground")}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="radio"
            type="button"
          >
            {selected ? <motion.span className="absolute inset-0 -z-10 rounded-md bg-white shadow-sm" layoutId={layoutId} transition={{ type: "spring", stiffness: 500, damping: 38 }} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const SCOPE_NAMES: Record<ScopeType, string> = { diocese: "Giáo phận", deanery: "Giáo hạt", parish: "Giáo xứ" };

export function FilterBar({ filters, onChange, options, scope, scopes, visible = {}, busy, appliedRange }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const { course = true, leader = true, unit = true, groupBy = true, inactive = true, groupByValues } = visible;
  const set = (patch: Partial<AnalyticsFilterState>) => onChange({ ...filters, ...patch });
  const layoutId = useId();

  const parishes = useMemo(() => (options?.parishes ?? []).filter((parish) => !filters.deaneryId || parish.parent === filters.deaneryId), [options?.parishes, filters.deaneryId]);
  const courses = useMemo(() => (options?.courses ?? []).filter((item) => !filters.courseType || item.parent === filters.courseType), [options?.courses, filters.courseType]);
  const showDeanery = unit && (options?.deaneries.length ?? 0) > 1 && scope !== "deanery" && scope !== "parish";
  const showParish = unit && (options?.parishes.length ?? 0) > 1 && scope !== "parish";
  const groupOptions = groupByOptions
    .filter((option) => !option.scopes || (scope && option.scopes.includes(scope)))
    .filter((option) => !groupByValues || option.value === "" || groupByValues.includes(option.value))
    .map((option) => ({ value: option.value, label: option.label }));

  const chips: { key: string; label: string; clear: () => void }[] = [];
  const named = (list: FilterOption[] | undefined, value: string) => list?.find((item) => item.value === value)?.label ?? value;
  if (filters.deaneryId && showDeanery) chips.push({ key: "deanery", label: `Giáo hạt: ${named(options?.deaneries, filters.deaneryId)}`, clear: () => set({ deaneryId: "", parishId: "" }) });
  if (filters.parishId && showParish) chips.push({ key: "parish", label: `Giáo xứ / giáo họ / giáo điểm: ${named(options?.parishes, filters.parishId)}`, clear: () => set({ parishId: "" }) });
  if (filters.courseType && course) chips.push({ key: "type", label: `Loại khóa: ${named(options?.courseTypes, filters.courseType)}`, clear: () => set({ courseType: "", courseCode: "" }) });
  if (filters.courseCode && course) chips.push({ key: "course", label: `Khóa: ${named(options?.courses, filters.courseCode)}`, clear: () => set({ courseCode: "" }) });
  if (filters.leaderLevel && leader) chips.push({ key: "level", label: `Cấp bậc: ${named(options?.leaderLevels, filters.leaderLevel)}`, clear: () => set({ leaderLevel: "" }) });
  if (filters.gender && leader) chips.push({ key: "gender", label: `Giới tính: ${named(genderOptions, filters.gender)}`, clear: () => set({ gender: "" }) });
  if (filters.groupBy && groupBy) chips.push({ key: "group", label: `Nhóm theo: ${groupOptions.find((option) => option.value === filters.groupBy)?.label ?? filters.groupBy}`, clear: () => set({ groupBy: "" }) });
  if (filters.includeInactiveUnits && inactive) chips.push({ key: "inactive", label: "Gồm đơn vị ngưng hoạt động", clear: () => set({ includeInactiveUnits: false }) });

  const dirty = JSON.stringify(filters) !== JSON.stringify(defaultFilters);
  const hasAdvanced = showDeanery || showParish || course || leader || groupBy || inactive;

  return (
    <div aria-busy={busy || undefined} className="rounded-xl border border-border bg-white p-3 shadow-sm sm:p-4">
      {scopes && scopes.length > 1 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-border pb-3">
          <span className="text-xs font-medium text-text-secondary">Phạm vi xem</span>
          <Segmented
            label="Phạm vi xem"
            layoutId={`scope-${layoutId}`}
            // Đổi phạm vi thì các bộ lọc đơn vị cũ không còn đúng nghĩa: bỏ chúng để số liệu luôn khớp phạm vi mới.
            onChange={(value) => set({ scope: value, deaneryId: "", parishId: "", groupBy: "" })}
            options={scopes.map((item) => ({ value: item.type, label: `${SCOPE_NAMES[item.type]} ${item.name}` }))}
            value={(filters.scope || scopes[0].type) as ScopeType}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2.5">
        <Popover.Root onOpenChange={setDateOpen} open={dateOpen}>
          <Popover.Trigger asChild>
            <button className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-foreground transition-[border-color,background-color] hover:border-primary/40 hover:bg-surface-1" type="button">
              <CalendarBlank className="h-4 w-4 text-primary" weight="bold" />
              {presetLabel(filters)}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="start" className="z-50 w-64 rounded-xl border border-border bg-white p-1.5 shadow-[var(--shadow-elevated)] data-[state=open]:animate-[account-menu-in_160ms_ease-out]" sideOffset={6}>
              <ul>
                {datePresets.map((preset) => (
                  <li key={preset.id}>
                    <button
                      className="flex h-9 w-full cursor-pointer items-center justify-between rounded-md px-2.5 text-sm text-foreground transition-colors hover:bg-surface-2"
                      onClick={() => {
                        set({ preset: preset.id });
                        setDateOpen(false);
                      }}
                      type="button"
                    >
                      {preset.label}
                      {filters.preset === preset.id ? <Check className="h-4 w-4 text-primary" weight="bold" /> : null}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 border-t border-border p-2.5">
                <p className="mb-2 text-xs font-medium text-text-secondary">Khoảng tùy chọn</p>
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label="Từ ngày" className={cn(fieldClass, "px-2 text-[13px]")} max={filters.toDate || undefined} onChange={(event) => set({ preset: "custom", fromDate: event.target.value })} type="date" value={filters.fromDate} />
                  <input aria-label="Đến ngày" className={cn(fieldClass, "px-2 text-[13px]")} min={filters.fromDate || undefined} onChange={(event) => set({ preset: "custom", toDate: event.target.value })} type="date" value={filters.toDate} />
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Segmented label="Gom theo kỳ" layoutId={`bucket-${layoutId}`} onChange={(value) => set({ timeBucket: value })} options={timeBucketOptions} value={filters.timeBucket} />

        <label className="inline-flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2 text-sm text-foreground">
          <button
            aria-checked={filters.compare}
            aria-label="So sánh với kỳ trước"
            className={cn("relative h-5 w-9 cursor-pointer rounded-full transition-colors duration-200", filters.compare ? "bg-primary" : "bg-input")}
            onClick={() => set({ compare: !filters.compare })}
            role="switch"
            type="button"
          >
            <span className={cn("absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200", filters.compare && "translate-x-4")} />
          </button>
          So sánh kỳ trước
        </label>

        <div className="ml-auto flex items-center gap-2">
          {dirty ? (
            <button className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-foreground" onClick={() => onChange(defaultFilters)} type="button">
              <ArrowCounterClockwise className="h-4 w-4" weight="bold" />
              Đặt lại
            </button>
          ) : null}
          {hasAdvanced ? (
            <button
              aria-expanded={open}
              className={cn("inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors", open ? "border-primary bg-primary-soft text-primary" : "border-input bg-white text-foreground hover:border-primary/40")}
              onClick={() => setOpen((value) => !value)}
              type="button"
            >
              <FadersHorizontal className="h-4 w-4" weight="bold" />
              Bộ lọc
              {chips.length ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs text-white">{chips.length}</span> : null}
            </button>
          ) : null}
        </div>
      </div>

      {appliedRange ? (
        <p className="mt-2.5 text-xs text-muted">
          Đang xem <span className="font-medium text-text-secondary">{formatDate(appliedRange.fromDate)} – {formatDate(appliedRange.toDate)}</span>
          {filters.compare && appliedRange.compareFromDate ? (
            <>
              {" "}· so sánh với <span className="font-medium text-text-secondary">{formatDate(appliedRange.compareFromDate)} – {formatDate(appliedRange.compareToDate)}</span>
            </>
          ) : null}
        </p>
      ) : null}

      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden" inert={!open}>
          <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            {showDeanery ? <Select label="Giáo hạt" onChange={(value) => set({ deaneryId: value, parishId: "" })} options={options?.deaneries ?? []} value={filters.deaneryId} /> : null}
            {showParish ? <Select label="Giáo xứ / giáo họ / giáo điểm" onChange={(value) => set({ parishId: value })} options={parishes} value={filters.parishId} /> : null}
            {course ? <Select label="Loại khóa" onChange={(value) => set({ courseType: value, courseCode: "" })} options={options?.courseTypes ?? []} value={filters.courseType} /> : null}
            {course ? <Select label="Khóa học" onChange={(value) => set({ courseCode: value })} options={courses} value={filters.courseCode} /> : null}
            {leader ? <Select label="Cấp bậc" onChange={(value) => set({ leaderLevel: value })} options={options?.leaderLevels ?? []} value={filters.leaderLevel} /> : null}
            {leader ? <Select label="Giới tính" onChange={(value) => set({ gender: value })} options={genderOptions} value={filters.gender} /> : null}
            {groupBy ? <Select label="Phân tích theo nhóm" onChange={(value) => set({ groupBy: value })} options={groupOptions.filter((option) => option.value !== "")} placeholder="Không nhóm thêm" value={filters.groupBy} /> : null}
            {inactive ? (
              <label className="flex cursor-pointer items-end gap-2.5 pb-2.5 text-sm text-foreground">
                <input checked={filters.includeInactiveUnits} className="mb-0.5 h-4 w-4 cursor-pointer accent-primary" onChange={(event) => set({ includeInactiveUnits: event.target.checked })} type="checkbox" />
                <span>
                  Gồm đơn vị ngưng hoạt động
                  <span className="block text-xs text-muted">Chỉ ảnh hưởng số liệu hiện tại; lịch sử luôn đủ.</span>
                </span>
              </label>
            ) : null}
          </div>
        </div>
      </div>

      {chips.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button className="analytics-rise inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-primary-soft pl-3 pr-2 text-xs font-medium text-primary transition-colors hover:bg-[#dbeafe]" onClick={chip.clear} type="button">
                {chip.label}
                <X className="h-3 w-3" weight="bold" />
                <span className="sr-only">Bỏ bộ lọc</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
