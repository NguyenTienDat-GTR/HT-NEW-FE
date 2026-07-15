"use client";

import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass } from "@phosphor-icons/react";
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
}: {
  route: RouteConfig;
  search: string;
  setSearch: (value: string) => void;
  status: string;
  filterValues: Record<string, string>;
  updateFilter: (key: string, value: string) => void;
  updateParam: (key: string, value: string) => void;
}) {
  return (
    <div className="border-b border-border bg-white p-4">
      <div className="grid gap-3 xl:grid-cols-4">
        <label className="relative xl:col-span-2">
          <span className="mb-2 block text-xs font-semibold text-foreground">Tìm kiếm</span>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-muted" />
          <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder={`Tìm kiếm ${route.title.toLowerCase()}`} value={search} />
        </label>

        {(route.filters ?? []).map((filter) => (
          <FilterControl
            filter={filter}
            key={filter.key}
            onChange={(value) => (filter.key === "status" ? updateParam("status", value) : updateFilter(filter.key, value))}
            value={filter.key === "status" ? status : (filterValues[filter.key] ?? "")}
          />
        ))}
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
        className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-foreground shadow-sm"
        disabled={query.isLoading}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{filter.key === "status" ? "Tất cả" : `Chọn ${filter.label.toLowerCase()}`}</option>
        {options.map((option: { value: string; label: string }) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
