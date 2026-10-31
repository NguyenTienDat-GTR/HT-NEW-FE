"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, Plus, SlidersHorizontal, X } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { Input } from "@/components/ui/input";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import { useEmbeddedResource } from "./embedded-resource-context";

import type { RouteConfig } from "@/config/routes/routes";
import type { RouteFilterConfig } from "@/config/routes/route-config";
import { optionFromRow, rowsFromResponse } from "@/components/form/resource-form/api-utils";
import { formatPermissionTaxonomyValue, permissionTaxonomyKindFromFilter } from "./permission-taxonomy-labels";
import { withFilters } from "@/lib/api/filters";

export function ResourceFilters({
  route,
  search,
  setSearch,
  status,
  filterValues,
  updateFilter,
  updateParam,
  resetFilters,
  canCreate,
  extraActions,
  leadingActions,
  hideSearch = false,
  showCreate = true,
}: {
  // Ẩn ô tìm kiếm riêng khi trang chứa có ô tìm kiếm chung.
  hideSearch?: boolean;
  // false khi nút tạo mới đã được đặt ở đầu trang.
  showCreate?: boolean;
  extraActions?: ReactNode;
  // Thao tác theo dòng đã chọn / thống kê: nằm ở hàng riêng dưới ô tìm kiếm (khi ẩn ô tìm kiếm thì đứng bên trái hàng đầu).
  leadingActions?: ReactNode;
  route: RouteConfig;
  search: string;
  setSearch: (value: string) => void;
  status: string;
  filterValues: Record<string, string>;
  updateFilter: (key: string, value: string) => void;
  updateParam: (key: string, value: string) => void;
  resetFilters: () => void;
  canCreate: boolean;
}) {
  const filters = route.filters ?? [];
  const valueOf = (filter: RouteFilterConfig) => (filter.key === "status" ? (status === "all" ? "" : status) : (filterValues[filter.key] ?? ""));
  const changeFilter = (filter: RouteFilterConfig, value: string) => {
    if (filter.key === "status") updateParam("status", value || "all");
    else updateFilter(filter.key, value);
  };
  const activeFilters = filters.filter((filter) => valueOf(filter) !== "");
  const activeFilterCount = activeFilters.length;

  return (
    <div className="space-y-3 border-b border-border bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {leadingActions && hideSearch ? <div className="flex flex-wrap items-center gap-2">{leadingActions}</div> : null}
        {!hideSearch ? (
          <div className="relative min-w-0 flex-1 lg:max-w-[480px]" role="search">
            <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label={`Tìm kiếm ${route.title.toLowerCase()}`}
              className="pl-9 pr-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Tìm kiếm ${route.title.toLowerCase()}`}
              type="search"
              value={search}
            />
            {search ? (
              <button
                aria-label="Xóa nội dung tìm kiếm"
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                onClick={() => setSearch("")}
                type="button"
              >
                <X size={14} weight="bold" />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {filters.length ? (
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
                      <Dialog.Description className="mt-0.5 text-[13px] text-muted">Thu hẹp danh sách {route.title.toLowerCase()} theo điều kiện.</Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                        <X size={20} />
                      </Button>
                    </Dialog.Close>
                  </div>
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
                    {filters.map((filter) => (
                      <FilterControl
                        filter={filter}
                        key={filter.key}
                        onChange={(value) => (filter.key === "status" ? updateParam("status", value) : updateFilter(filter.key, value))}
                        parentValue={filter.dependsOn ? (filterValues[filter.dependsOn.filterKey] ?? "") : ""}
                        value={filter.key === "status" ? status : (filterValues[filter.key] ?? "")}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border bg-white px-5 py-3">
                    <Button disabled={activeFilterCount === 0 && !search} onClick={resetFilters} type="button" variant="ghost">
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
          {extraActions}
          {showCreate && route.primaryActionLabel && route.createPath && canCreate ? (
            <Button asChild className="shrink-0 justify-center">
              <Link href={route.createPath as Route}>
                <Plus size={18} />
                {route.primaryActionLabel}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {leadingActions && !hideSearch ? <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-1 px-3 py-2">{leadingActions}</div> : null}

      {activeFilterCount > 0 ? (
        <div aria-label="Bộ lọc đang áp dụng" className="flex flex-wrap items-center gap-2" role="group">
          {activeFilters.map((filter) => (
            <ActiveFilterChip filter={filter} key={filter.key} onClear={() => changeFilter(filter, "")} parentValue={filter.dependsOn ? (filterValues[filter.dependsOn.filterKey] ?? "") : ""} value={valueOf(filter)} />
          ))}
          <button className="cursor-pointer px-1 text-[13px] font-semibold text-primary transition-colors hover:text-primary-hover" onClick={resetFilters} type="button">
            Xóa tất cả
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Đường dẫn lựa chọn có ":courseCode" được thay bằng mã khóa của trang chứa (tab trong chi tiết khóa), ví dụ danh sách đội của khóa.
const COURSE_CODE_PLACEHOLDER = ":courseCode";

function useFilterOptions(filter: RouteFilterConfig, parentValue: string) {
  const embedded = useEmbeddedResource();
  const courseCode = embedded?.fixedFilters["course.courseCode"];
  const needsCourse = Boolean(filter.optionsEndpoint?.includes(COURSE_CODE_PLACEHOLDER));
  const resolved = needsCourse && courseCode ? { ...filter, optionsEndpoint: filter.optionsEndpoint?.replace(COURSE_CODE_PLACEHOLDER, encodeURIComponent(courseCode)) } : filter;
  const query = useQuery({
    queryKey: ["toolbar-filter-options", filter.key, resolved.optionsEndpoint, filter.optionCollection, parentValue],
    enabled: Boolean(resolved.optionsEndpoint) && !(needsCourse && !courseCode),
    queryFn: () => fetchFilterOptions(resolved, parentValue),
  });
  const apiOptions = filterRowsFromResponse(query.data, filter.optionCollection).map((row) => optionFromRow(row, filter.optionValue, filter.optionLabel));
  const options = localizeFilterOptions(filter, filter.options ?? apiOptions);
  return { options, isLoading: query.isLoading };
}

function ActiveFilterChip({ filter, value, parentValue, onClear }: { filter: RouteFilterConfig; value: string; parentValue: string; onClear: () => void }) {
  const { options } = useFilterOptions(filter, parentValue);
  const valueLabel = filter.type === "text" ? value : (options.find((option) => option.value === value)?.label ?? value);
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-soft py-1 pl-3 pr-1.5 text-[13px] text-primary">
      <span className="truncate">
        <span className="text-text-secondary">{filter.label}: </span>
        <span className="font-semibold">{valueLabel}</span>
      </span>
      <button
        aria-label={`Bỏ lọc ${filter.label}`}
        className="grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full text-primary transition-colors hover:bg-white"
        onClick={onClear}
        type="button"
      >
        <X size={12} weight="bold" />
      </button>
    </span>
  );
}

function FilterControl({
  filter,
  value,
  onChange,
  parentValue = "",
}: {
  filter: RouteFilterConfig;
  value: string;
  onChange: (value: string) => void;
  parentValue?: string;
}) {
  const { options, isLoading } = useFilterOptions(filter, parentValue);
  const hasExplicitAllOption = options.some((option) => option.value === "all");

  if (filter.type === "text") {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">{filter.label}</span>
        <Input onChange={(event) => onChange(event.target.value)} placeholder={filter.placeholder ?? `Lọc theo ${filter.label.toLowerCase()}`} value={value} />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">{filter.label}</span>
      <select
        className="h-10 w-full cursor-pointer rounded-lg border border-input bg-white px-3 text-sm text-foreground transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
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

function localizeFilterOptions(filter: RouteFilterConfig, options: { value: string; label: string }[]) {
  const taxonomyKind = permissionTaxonomyKindFromFilter(filter.key, filter.optionCollection);
  if (!taxonomyKind) return options;
  return options.map((option) => ({
    ...option,
    label: formatPermissionTaxonomyValue(taxonomyKind, option.value) ?? option.label,
  }));
}

async function fetchFilterOptions(filter: RouteFilterConfig, parentValue = "") {
  try {
    // Bộ lọc phụ thuộc chỉ lấy các đơn vị thuộc giá trị đang chọn của bộ lọc cha.
    const scoped =
      filter.dependsOn && parentValue
        ? withFilters(filter.optionsEndpoint ?? "", { [filter.dependsOn.optionFilterField]: parentValue })
        : filter.optionsEndpoint;
    return await apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[] | Record<string, unknown>>(optionEndpointWithPaging(scoped));
  } catch (error) {
    if (!filter.optionsEndpoint?.includes("/system/permissions/taxonomy") || !filter.optionCollection) throw error;
    const permissions = await apiFetch<PageResponse<Record<string, unknown>>>("/system/permissions?page=0&size=100");
    return buildPermissionTaxonomyFallback(permissions, filter.optionCollection);
  }
}

export function buildPermissionTaxonomyFallback(permissions: PageResponse<Record<string, unknown>>, collection: string) {
  const codeField = permissionCodeFieldForCollection(collection);
  if (!codeField) return [];
  const seen = new Set<string>();
  return permissions.content
    .map((permission) => permission[codeField])
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .sort((left, right) => left.localeCompare(right))
    .map((code) => ({ code, name: code }));
}

function permissionCodeFieldForCollection(collection: string) {
  switch (collection) {
    case "modules":
      return "moduleCode";
    case "resources":
      return "resourceCode";
    case "actions":
      return "actionCode";
    case "scopes":
      return "scopeCode";
    default:
      return undefined;
  }
}

export function filterRowsFromResponse(data: PageResponse<Record<string, unknown>> | Record<string, unknown>[] | Record<string, unknown> | undefined, collection?: string) {
  if (!data) return [];
  if (collection && !Array.isArray(data) && !(data as PageResponse<Record<string, unknown>>).content) {
    const value = (data as Record<string, unknown>)[collection];
    return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [];
  }
  return rowsFromResponse(data as PageResponse<Record<string, unknown>> | Record<string, unknown>[] | undefined);
}

function optionEndpointWithPaging(endpoint: string | undefined) {
  if (!endpoint) return "";
  if (endpoint.includes("/taxonomy")) return endpoint;
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}page=0&size=100`;
}
