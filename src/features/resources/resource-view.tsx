"use client";

import { MagnifyingGlass, SlidersHorizontal } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import { serializeBaseSearch } from "@/lib/api/search";
import { viNumber } from "@/lib/utils";
import type { RouteConfig } from "@/features/workspace/routes";

export function ResourceView({ route }: { route: RouteConfig }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const page = Number(searchParams.get("page") ?? 0);
  const size = Number(searchParams.get("size") ?? 10) as 10 | 20 | 50 | 100;
  const sortBy = searchParams.get("sortBy") ?? undefined;
  const sortDirection = (searchParams.get("sortDirection") as "ASC" | "DESC" | null) ?? "ASC";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (search) next.set("search", search);
      else next.delete("search");
      next.set("page", "0");
      router.replace(`${pathname}?${next.toString()}` as Route);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [pathname, router, search, searchParams]);

  const queryString = useMemo(() => {
    return serializeBaseSearch({
      page,
      size,
      search,
      searchFields: route.searchFields,
      sortBy,
      sortDirection,
    }).toString();
  }, [page, route.searchFields, search, size, sortBy, sortDirection]);

  const query = useQuery({
    queryKey: ["resource", route.endpoint, queryString],
    enabled: Boolean(route.endpoint),
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>>>(`${route.endpoint}?${queryString}`),
  });

  function updatePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(Math.max(nextPage, 0)));
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function updateSize(nextSize: string) {
    const next = new URLSearchParams(searchParams);
    next.set("size", nextSize);
    next.set("page", "0");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function sort(column: string) {
    const next = new URLSearchParams(searchParams);
    next.set("sortBy", column);
    next.set("sortDirection", sortBy === column && sortDirection === "ASC" ? "DESC" : "ASC");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  const rows = query.data?.content ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[0]">{route.title}</h1>
          <p className="mt-1 text-sm text-muted">{route.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <SlidersHorizontal size={18} />
            Bộ lọc
          </Button>
          <Button>Thêm mới</Button>
        </div>
      </div>
      <Panel className="p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative w-full sm:max-w-[360px]">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm" value={search} />
          </label>
          <select
            aria-label="Số dòng mỗi trang"
            className="h-11 rounded-[8px] border border-border bg-white px-3 text-sm"
            onChange={(event) => updateSize(event.target.value)}
            value={size}
          >
            {[10, 20, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value} dòng
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                {route.columns.map((column) => (
                  <th className="h-12 border-b border-border pr-4 font-semibold" key={column}>
                    <button className="inline-flex h-11 items-center gap-1 rounded-[8px] px-1" onClick={() => sort(column)} type="button">
                      {column}
                      {sortBy === column ? <span className="text-primary">{sortDirection}</span> : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.isLoading
                ? Array.from({ length: size }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {route.columns.map((column) => (
                        <td className="h-12 border-b border-surface-2 pr-4" key={column}>
                          <span className="block h-4 w-24 rounded bg-surface-2 motion-safe:animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((row, rowIndex) => (
                    <tr className="hover:bg-surface-1" key={String(row.id ?? row.username ?? row.certificateCode ?? rowIndex)}>
                      {route.columns.map((column) => (
                        <td className="h-12 border-b border-surface-2 pr-4" key={column}>
                          <Cell value={row[column]} />
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!query.isLoading && rows.length === 0 ? (
          <div className="grid min-h-[180px] place-items-center text-center text-sm text-muted">Không có dữ liệu phù hợp</div>
        ) : null}
        {query.isError ? <div className="mt-4 rounded-[8px] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">Không tải được dữ liệu</div> : null}
        <div className="mt-4 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            Tổng {viNumber.format(query.data?.totalElements ?? 0)} bản ghi, trang {page + 1}/{Math.max(query.data?.totalPages ?? 1, 1)}
          </span>
          <div className="flex gap-2">
            <Button disabled={page <= 0} onClick={() => updatePage(page - 1)} variant="outline">
              Trước
            </Button>
            <Button disabled={query.data?.last ?? true} onClick={() => updatePage(page + 1)} variant="outline">
              Sau
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Cell({ value }: { value: unknown }) {
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-success" : "text-danger"}>
        {value ? "Hoạt động" : "Tạm ngưng"}
      </span>
    );
  }
  if (value === null || value === undefined || value === "") return <span className="text-muted">Chưa có</span>;
  if (typeof value === "number") return viNumber.format(value);
  return <span className="line-clamp-1">{String(value)}</span>;
}
