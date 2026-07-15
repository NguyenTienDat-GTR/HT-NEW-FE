"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import type { RouteConfig } from "@/features/workspace/routes";

export function ResourceFilters({
  route,
  search,
  setSearch,
  status,
  updateParam,
}: {
  route: RouteConfig;
  search: string;
  setSearch: (value: string) => void;
  status: string;
  updateParam: (key: string, value: string) => void;
}) {
  return (
    <div className="border-b border-border bg-white p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <label className="relative w-full xl:max-w-[460px]">
          <span className="mb-2 block text-xs font-semibold text-foreground">Tìm kiếm</span>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-muted" />
          <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder={`Tìm kiếm ${route.title.toLowerCase()}`} value={search} />
        </label>
        <label>
          <span className="mb-2 block text-xs font-semibold text-foreground">Trạng thái</span>
          <select
            aria-label="Lọc trạng thái"
            className="h-11 min-w-[170px] rounded-[10px] border border-border bg-white px-3 text-sm text-foreground shadow-sm"
            onChange={(event) => updateParam("status", event.target.value)}
            value={status}
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
        </label>
      </div>
    </div>
  );
}
