"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { serializeBaseSearch } from "@/lib/api/search";
import type { RouteConfig } from "@/config/routes/routes";

export type ResourcePageSize = 10 | 20 | 50 | 100;

export function useResourceQueryState(route: RouteConfig, fixedFilters: Record<string, string> = {}, externalSearch?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localSearch, setSearch] = useState(searchParams.get("search") ?? "");
  // Có ô tìm kiếm chung bên ngoài (chi tiết khóa) thì dùng từ khóa đó thay cho ô tìm kiếm riêng.
  const search = externalSearch ?? localSearch;

  const page = parseUrlPage(searchParams.get("page")) - 1;
  const size = parsePageSize(searchParams.get("size"));
  const urlSearch = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "all";
  const sortBy = searchParams.get("sortBy") ?? undefined;
  const sortDirection = (searchParams.get("sortDirection") as "ASC" | "DESC" | null) ?? "ASC";
  const filterValues = useMemo(
    () =>
      Object.fromEntries(
        (route.filters ?? [])
          .filter((filter) => filter.key !== "status")
          .map((filter) => [filter.key, searchParams.get(filter.key) ?? ""]),
      ),
    [route.filters, searchParams],
  );

  useEffect(() => {
    if (externalSearch !== undefined || search === urlSearch) return;

    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (search) next.set("search", search);
      else next.delete("search");
      next.set("page", "1");
      router.replace(`${pathname}?${next.toString()}` as Route);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [externalSearch, pathname, router, search, searchParams, urlSearch]);

  const queryString = useMemo(() => {
    return serializeBaseSearch({
      page,
      size,
      search,
      status: status === "all" ? undefined : status === "active",
      filters: {
        ...Object.fromEntries(
          (route.filters ?? [])
            .filter((filter) => filter.key !== "status")
            .map((filter) => [filter.key, normalizeFilterValue(filterValues[filter.key], filter.type)]),
        ),
        ...fixedFilters,
      },
      searchFields: route.searchFields,
      sortBy,
      sortDirection,
    }).toString();
  }, [filterValues, fixedFilters, page, route.filters, route.searchFields, search, size, sortBy, sortDirection, status]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function updatePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(Math.max(nextPage, 0) + 1));
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function updatePageSize(nextSize: ResourcePageSize) {
    const next = new URLSearchParams(searchParams);
    next.set("size", String(nextSize));
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    // Đổi bộ lọc cha thì bỏ giá trị các bộ lọc con (giáo hạt -> giáo xứ) vì không còn thuộc lựa chọn mới.
    dependentFilterKeys(route.filters ?? [], key).forEach((child) => next.delete(child));
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function resetFilters() {
    const next = new URLSearchParams(searchParams);
    next.delete("status");
    (route.filters ?? []).forEach((filter) => {
      if (filter.key !== "status") next.delete(filter.key);
    });
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function sort(column: string) {
    const next = new URLSearchParams(searchParams);
    next.set("sortBy", column);
    next.set("sortDirection", sortBy === column && sortDirection === "ASC" ? "DESC" : "ASC");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  return {
    page,
    queryString,
    search,
    setSearch,
    size,
    sort,
    sortBy,
    sortDirection,
    status,
    filterValues,
    updatePage,
    updatePageSize,
    updateFilter,
    updateParam,
    resetFilters,
  };
}

function dependentFilterKeys(filters: NonNullable<RouteConfig["filters"]>, parentKey: string): string[] {
  const direct = filters.filter((filter) => filter.dependsOn?.filterKey === parentKey).map((filter) => filter.key);
  return direct.flatMap((key) => [key, ...dependentFilterKeys(filters, key)]);
}

function parseUrlPage(value: string | null) {
  const page = Number(value ?? 0);
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

function parsePageSize(value: string | null): ResourcePageSize {
  const size = Number(value ?? 10);
  if (size === 20 || size === 50 || size === 100) return size;
  return 10;
}

function normalizeFilterValue(value: string | undefined, type?: "text" | "select" | "boolean") {
  if (!value) return undefined;
  if (type === "boolean") return value === "true";
  return value;
}
