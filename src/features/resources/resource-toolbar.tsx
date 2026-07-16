"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, SlidersHorizontal, X } from "@phosphor-icons/react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import type { RouteConfig } from "@/features/workspace/routes";
import type { RouteFilterConfig } from "@/features/workspace/route-config";
import { optionFromRow, rowsFromResponse } from "@/features/forms/api-utils";

export function ResourceFilters({
  route,
  search,
  setSearch,
  status,
  filterValues,
  updateFilter,
  updateParam,
  resetFilters,
}: {
  route: RouteConfig;
  search: string;
  setSearch: (value: string) => void;
  status: string;
  filterValues: Record<string, string>;
  updateFilter: (key: string, value: string) => void;
  updateParam: (key: string, value: string) => void;
  resetFilters: () => void;
}) {
  const filters = route.filters ?? [];
  const activeFilterCount = useMemo(() => {
    const statusCount = status !== "all" ? 1 : 0;
    const fieldCount = Object.values(filterValues).filter(Boolean).length;
    return statusCount + fieldCount;
  }, [filterValues, status]);

  return (
    <div className="border-b border-border bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="relative min-w-0 flex-1">
          <span className="mb-2 block text-xs font-semibold text-foreground">Tìm kiếm</span>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-muted" />
          <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder={`Tìm kiếm ${route.title.toLowerCase()}`} value={search} />
        </label>

        {filters.length ? (
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <Button className="shrink-0 justify-center" type="button" variant="outline">
                <SlidersHorizontal size={18} />
                Bộ lọc
                {activeFilterCount ? (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
              <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[440px] flex-col border-l border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
                <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                  <div>
                    <Dialog.Title className="text-xl font-semibold text-foreground">Bộ lọc</Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-muted">Chọn điều kiện để thu hẹp danh sách {route.title.toLowerCase()}.</Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                      <X size={20} />
                    </Button>
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                  {filters.map((filter) => (
                    <FilterControl
                      filter={filter}
                      key={filter.key}
                      onChange={(value) => (filter.key === "status" ? updateParam("status", value) : updateFilter(filter.key, value))}
                      value={filter.key === "status" ? status : (filterValues[filter.key] ?? "")}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-3 border-t border-border bg-surface-1/60 p-4">
                  <Button onClick={resetFilters} type="button" variant="outline">
                    Xóa lọc
                  </Button>
                  <Dialog.Close asChild>
                    <Button type="button">Áp dụng</Button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        ) : null}
      </div>
    </div>
  );
}

function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: RouteFilterConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const query = useQuery({
    queryKey: ["toolbar-filter-options", filter.key, filter.optionsEndpoint],
    enabled: Boolean(filter.optionsEndpoint),
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>(`${filter.optionsEndpoint}?page=0&size=100`),
  });

  const apiOptions = rowsFromResponse(query.data).map((row) => optionFromRow(row, filter.optionValue, filter.optionLabel));
  const options = filter.options ?? apiOptions;
  const hasExplicitAllOption = options.some((option) => option.value === "all");

  if (filter.type === "text") {
    return (
      <label>
        <span className="mb-2 block text-xs font-semibold text-foreground">{filter.label}</span>
        <Input onChange={(event) => onChange(event.target.value)} placeholder={filter.placeholder ?? `Lọc theo ${filter.label.toLowerCase()}`} value={value} />
      </label>
    );
  }

  return (
    <label>
      <span className="mb-2 block text-xs font-semibold text-foreground">{filter.label}</span>
      <select
        className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-foreground shadow-sm transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--primary-ring)]"
        disabled={query.isLoading}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {!hasExplicitAllOption ? <option value="">{filter.key === "status" ? "Tất cả" : `Chọn ${filter.label.toLowerCase()}`}</option> : null}
        {options.map((option: { value: string; label: string }) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
