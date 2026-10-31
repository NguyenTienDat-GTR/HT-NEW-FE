"use client";

import { type PageResponse } from "@/lib/api/client";
import type { UseQueryResult } from "@tanstack/react-query";
import type { CertificateLibraryState } from "../use-certificate-library-state";
import * as Dialog from "@radix-ui/react-dialog";
import { MagnifyingGlass, Plus, SlidersHorizontal, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Tip } from "@/components/ui/tip";
import { getApiErrorMessage } from "@/lib/api/client";
import type {  } from "@/config/routes/routes";
import { cn } from "@/lib/utils";
import { PAPER_OPTIONS, SCOPE_LABELS, type ConfigResponse, type CourseTypeRef } from "./certificate-design";
import { ConfigPreviewTip } from "./certificate-config-preview";
import { FilterSelect, Pill } from "@/modules/layout-config/form-controls";
import { EMPTY_FILTERS, SORT_OPTIONS } from "../certificate-library-params";

export function CertificateLibraryPanel({
  library,
  libraryQuery,
  courseTypes,
  fieldLabel,
  canCreate,
  isNew,
  resolvedId,
  selectConfig,
  startNew,
}: {
  library: CertificateLibraryState;
  libraryQuery: UseQueryResult<PageResponse<ConfigResponse>>;
  courseTypes: CourseTypeRef[];
  fieldLabel: (key?: string) => string;
  canCreate: boolean;
  isNew: boolean;
  resolvedId: string | null;
  selectConfig: (id: string) => void;
  startNew: () => void;
}) {
  const { searchInput, setSearchInput, filters, setFilters, sort, setSort, page, setPage, filtering, activeFilterCount, updateFilters } = library;
  const libraryItems = libraryQuery.data?.content ?? [];
  const totalPages = libraryQuery.data?.totalPages ?? 0;
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="text-base font-semibold leading-6 text-foreground">Thư viện cấu hình</h2>
          <HelpTip label="Hướng dẫn thư viện cấu hình">
            Cấu hình chung dùng cho mọi loại khóa chưa được gán cấu hình riêng. Một cấu hình có thể gán cho nhiều loại khóa; mỗi loại khóa chỉ dùng một cấu hình.
          </HelpTip>
        </div>
        {canCreate ? (
          <Button onClick={startNew} type="button" variant={isNew ? "primary" : "outline"}>
            <Plus size={18} /> Tạo cấu hình mới
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-[480px]" role="search">
          <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            aria-label="Tìm theo tên cấu hình hoặc loại khóa"
            className="pl-9 pr-9"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm theo tên cấu hình hoặc loại khóa…"
            type="search"
            value={searchInput}
          />
          {searchInput ? (
            <button
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              onClick={() => setSearchInput("")}
              type="button"
            >
              <X size={14} weight="bold" />
            </button>
          ) : null}
        </div>
        <Dialog.Root>
          <Tip label="Lọc danh sách theo điều kiện">
            <Dialog.Trigger asChild>
              <Button className="shrink-0 justify-center" type="button" variant="outline">
                <SlidersHorizontal size={18} />
                Bộ lọc
                {activeFilterCount ? (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">{activeFilterCount}</span>
                ) : null}
              </Button>
            </Dialog.Trigger>
          </Tip>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
            <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
                <div className="min-w-0">
                  <Dialog.Title className="text-lg font-semibold leading-[26px] text-foreground">Bộ lọc</Dialog.Title>
                  <Dialog.Description className="mt-0.5 text-[13px] text-muted">Thu hẹp thư viện cấu hình theo điều kiện.</Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                    <X size={20} />
                  </Button>
                </Dialog.Close>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
                <FilterSelect
                  label="Phạm vi"
                  onChange={(value) => updateFilters({ scope: value })}
                  options={[["SYSTEM", "Hệ thống"], ["DIOCESE", "Giáo phận"], ["DEANERY", "Giáo hạt"]]}
                  value={filters.scope}
                />
                <FilterSelect
                  label="Cấu hình chung"
                  onChange={(value) => updateFilters({ isDefault: value })}
                  options={[["true", "Chỉ cấu hình chung"], ["false", "Không phải cấu hình chung"]]}
                  value={filters.isDefault}
                />
                <FilterSelect
                  label="Sử dụng"
                  onChange={(value) => updateFilters({ used: value })}
                  options={[["true", "Đang được dùng"], ["false", "Chưa có loại khóa dùng"]]}
                  value={filters.used}
                />
                <FilterSelect
                  label="Loại khóa"
                  onChange={(value) => updateFilters({ courseTypeCode: value })}
                  options={courseTypes.map((type) => [type.typeCode, type.typeName || type.typeCode] as [string, string])}
                  value={filters.courseTypeCode}
                />
                <FilterSelect
                  label="Khổ giấy"
                  onChange={(value) => updateFilters({ paperSize: value })}
                  options={PAPER_OPTIONS.map((option) => [option.value, option.label] as [string, string])}
                  value={filters.paperSize}
                />
                <FilterSelect
                  label="Hướng in"
                  onChange={(value) => updateFilters({ orientation: value })}
                  options={[["LANDSCAPE", "Ngang"], ["PORTRAIT", "Dọc"]]}
                  value={filters.orientation}
                />
                <FilterSelect
                  allLabel="Mặc định"
                  label="Sắp xếp"
                  onChange={(value) => {
                    setSort(value || "default");
                    setPage(0);
                  }}
                  options={SORT_OPTIONS.filter(([value]) => value !== "default")}
                  value={sort === "default" ? "" : sort}
                />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border bg-white px-5 py-3">
                <Button
                  disabled={activeFilterCount === 0}
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    setSort("default");
                    setPage(0);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Xóa lọc
                </Button>
                <Dialog.Close asChild>
                  <Button type="button">Áp dụng</Button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="p-4">
        {libraryQuery.isError ? (
          <p className="mb-3 text-sm text-danger" role="alert">
            {getApiErrorMessage(libraryQuery.error)}
          </p>
        ) : null}
        {libraryQuery.isLoading ? <p className="text-sm text-muted">Đang tải thư viện…</p> : null}
        {libraryQuery.data && libraryItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
            {filtering ? "Không có cấu hình nào khớp bộ lọc. Thử bỏ bớt điều kiện lọc." : "Thư viện còn trống. Cấu hình đầu tiên bạn tạo sẽ tự động là cấu hình chung."}
          </p>
        ) : null}

        <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-3", libraryQuery.isPlaceholderData && "opacity-60")}>
          {libraryItems.map((config) => {
            const active = config.id === resolvedId;
            return (
              <div
                key={config.id}
                className={cn(
                  "rounded-xl border p-3 transition-[border-color,box-shadow,background-color]",
                  active ? "border-primary bg-primary-soft/60 shadow-[0_0_0_1px_var(--primary)]" : "border-border bg-white hover:border-slate-300 hover:shadow-sm",
                )}
              >
                <ConfigPreviewTip config={config} fieldLabel={fieldLabel}>
                  <button aria-pressed={active} className="block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => selectConfig(config.id)} type="button">
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
                    </span>
                    <span className="mt-2 block text-xs text-text-secondary">
                      {config.usedByCount > 0 ? `Đang dùng cho ${config.usedByCount} loại khóa` : "Chưa có loại khóa nào dùng"}
                      {" · "}
                      {config.paperSize} {config.orientation === "PORTRAIT" ? "dọc" : "ngang"}
                    </span>
                  </button>
                </ConfigPreviewTip>
                {config.usedByCount > 0 ? (
                  <details className="mt-2 text-xs text-text-secondary">
                    <summary className="cursor-pointer select-none font-medium text-primary">Xem các loại khóa</summary>
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                      {config.usedByCourseTypes.map((type) => (
                        <li key={type.typeCode}>{type.typeName || type.typeCode}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {libraryQuery.data && libraryQuery.data.totalElements > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-[13px] text-muted">
          <span>
            {libraryQuery.data.totalElements} cấu hình · Trang {page + 1}/{Math.max(totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <Button disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))} size="sm" type="button" variant="outline">
              Trước
            </Button>
            <Button disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} size="sm" type="button" variant="outline">
              Sau
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
