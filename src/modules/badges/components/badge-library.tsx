"use client";

import { MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import { SCOPE_LABELS } from "@/modules/certificates/components/certificate-design";
import { formatMm, PAPER_SIZES } from "../badge-sheet";
import type { BadgeConfig } from "../badge-design";
import { Pill, SELECT_CLASS } from "./form-controls";

export type LibraryFilters = { scope: string; hasBack: string; paperSize: string };

export const EMPTY_LIBRARY_FILTERS: LibraryFilters = { scope: "", hasBack: "", paperSize: "" };

export const LIBRARY_PAGE_SIZE = 6;

// Tham số truy vấn thư viện: tìm kiếm, lọc và phân trang đều do BE xử lý.
export function buildLibraryParams({ search, filters, page }: { search: string; filters: LibraryFilters; page: number }) {
  const params = new URLSearchParams({ page: String(page), size: String(LIBRARY_PAGE_SIZE) });
  if (search) params.set("search", search);
  const active = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  if (Object.keys(active).length > 0) params.set("filters", JSON.stringify(active));
  return params.toString();
}

export function BadgeLibrary({
  items,
  activeId,
  isNew,
  loading,
  error,
  placeholder,
  totalElements,
  totalPages,
  page,
  searchInput,
  filters,
  canCreate,
  onSearchChange,
  onFiltersChange,
  onPageChange,
  onSelect,
  onCreate,
}: {
  items: BadgeConfig[];
  activeId: string | null;
  isNew: boolean;
  loading: boolean;
  error: string | null;
  placeholder: boolean;
  totalElements: number;
  totalPages: number;
  page: number;
  searchInput: string;
  filters: LibraryFilters;
  canCreate: boolean;
  onSearchChange: (value: string) => void;
  onFiltersChange: (patch: Partial<LibraryFilters>) => void;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const filtering = Boolean(searchInput.trim()) || Object.values(filters).some(Boolean);
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="text-base font-semibold leading-6 text-foreground">Thư viện cấu hình thẻ</h2>
          <HelpTip label="Hướng dẫn thư viện cấu hình thẻ">
            Cấu hình chung của phạm vi được dùng khi xuất thẻ cho khóa; khi xuất vẫn chọn được cấu hình khác trong thư viện. Giáo hạt dùng được cấu hình của giáo phận và hệ thống.
          </HelpTip>
        </div>
        {canCreate ? (
          <Button onClick={onCreate} type="button" variant={isNew ? "primary" : "outline"}>
            <Plus size={18} /> Tạo cấu hình mới
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-[420px]" role="search">
          <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input aria-label="Tìm theo tên cấu hình" className="pl-9 pr-9" onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm theo tên cấu hình…" type="search" value={searchInput} />
          {searchInput ? (
            <button
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              onClick={() => onSearchChange("")}
              type="button"
            >
              <X size={14} weight="bold" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Lọc theo phạm vi" className={SELECT_CLASS} onChange={(event) => onFiltersChange({ scope: event.target.value })} value={filters.scope}>
            <option value="">Mọi phạm vi</option>
            <option value="SYSTEM">Hệ thống</option>
            <option value="DIOCESE">Giáo phận</option>
            <option value="DEANERY">Giáo hạt</option>
          </select>
          <select aria-label="Lọc theo khổ giấy" className={SELECT_CLASS} onChange={(event) => onFiltersChange({ paperSize: event.target.value })} value={filters.paperSize}>
            <option value="">Mọi khổ giấy</option>
            {PAPER_SIZES.map((paper) => (
              <option key={paper.value} value={paper.value}>{paper.value === "LETTER" ? "Letter" : paper.value === "LEGAL" ? "Legal" : paper.value}</option>
            ))}
          </select>
          <select aria-label="Lọc theo mặt sau" className={SELECT_CLASS} onChange={(event) => onFiltersChange({ hasBack: event.target.value })} value={filters.hasBack}>
            <option value="">Một hoặc hai mặt</option>
            <option value="true">Có mặt sau</option>
            <option value="false">Chỉ mặt trước</option>
          </select>
          {filtering ? (
            <Button onClick={() => { onSearchChange(""); onFiltersChange({ ...EMPTY_LIBRARY_FILTERS }); }} type="button" variant="ghost">
              Xóa lọc
            </Button>
          ) : null}
        </div>
      </div>

      <div className="p-4">
        {error ? (
          <p className="mb-3 text-sm text-danger" role="alert">{error}</p>
        ) : null}
        {loading ? <p className="text-sm text-muted">Đang tải thư viện…</p> : null}
        {!loading && items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
            {filtering ? "Không có cấu hình nào khớp bộ lọc. Thử bỏ bớt điều kiện lọc." : "Thư viện còn trống. Cấu hình đầu tiên bạn tạo sẽ tự động là cấu hình chung."}
          </p>
        ) : null}
        <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-3", placeholder && "opacity-60")}>
          {items.map((config) => {
            const active = config.id === activeId;
            return (
              <button
                aria-pressed={active}
                className={cn(
                  "block w-full cursor-pointer rounded-xl border p-3 text-left transition-[border-color,box-shadow,background-color] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                  active ? "border-primary bg-primary-soft/60 shadow-[0_0_0_1px_var(--primary)]" : "border-border bg-white hover:border-slate-300 hover:shadow-sm",
                )}
                key={config.id}
                onClick={() => onSelect(config.id)}
                type="button"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 text-sm font-semibold leading-5 text-foreground">{config.name}</span>
                  {active ? <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">Đang mở</span> : null}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-1.5">
                  {config.isDefault ? <Pill tone="primary">Cấu hình chung</Pill> : null}
                  <Pill>
                    {SCOPE_LABELS[config.scopeLevel]}
                    {!config.editable ? " · chỉ xem" : ""}
                  </Pill>
                  {config.hasBack ? <Pill tone="success">2 mặt</Pill> : <Pill>1 mặt</Pill>}
                </span>
                <span className="mt-2 block text-xs text-text-secondary">
                  Thẻ {formatMm(config.cardWidthMm ?? 0)} × {formatMm(config.cardHeightMm ?? 0)} mm · {config.paperSize} {config.paperOrientation === "LANDSCAPE" ? "ngang" : "dọc"}
                  {config.cardsPerPage ? ` · ${config.cardsPerPage} thẻ/trang` : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {totalElements > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-[13px] text-muted">
          <span>
            {totalElements} cấu hình · Trang {page + 1}/{Math.max(totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <Button disabled={page <= 0} onClick={() => onPageChange(Math.max(0, page - 1))} size="sm" type="button" variant="outline">
              Trước
            </Button>
            <Button disabled={page + 1 >= totalPages} onClick={() => onPageChange(page + 1)} size="sm" type="button" variant="outline">
              Sau
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
