"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { serializeBaseSearch } from "@/lib/api/search";
import type { RouteConfig } from "@/features/workspace/routes";

export type ResourcePageSize = 10 | 20 | 50 | 100;

export function useResourceQueryState(route: RouteConfig) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const page = parseUrlPage(searchParams.get("page")) - 1;
  const size = parsePageSize(searchParams.get("size"));
  const urlSearch = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "all";
  const sortBy = searchParams.get("sortBy") ?? undefined;
  const sortDirection = (searchParams.get("sortDirection") as "ASC" | "DESC" | null) ?? "ASC";

  useEffect(() => {
    if (search === urlSearch) return;

    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (search) next.set("search", search);
      else next.delete("search");
      next.set("page", "1");
      router.replace(`${pathname}?${next.toString()}` as Route);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [pathname, router, search, searchParams, urlSearch]);

  const queryString = useMemo(() => {
    return serializeBaseSearch({
      page,
      size,
      search,
      status: status === "all" ? undefined : status === "active",
      searchFields: route.searchFields,
      sortBy,
      sortDirection,
    }).toString();
  }, [page, route.searchFields, search, size, sortBy, sortDirection, status]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
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
    updatePage,
    updatePageSize,
    updateParam,
  };
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
