"use client";

import { FunnelSimple, MagnifyingGlass, Plus, SlidersHorizontal } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RouteConfig } from "@/features/workspace/routes";

export function ResourceHeader({ canCreate, route }: { canCreate: boolean; route: RouteConfig }) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <div className="mb-2 inline-flex h-7 items-center gap-2 rounded-full border border-border bg-white px-3 text-xs font-semibold text-muted">
          <FunnelSimple className="h-3.5 w-3.5 text-primary" />
          {route.moduleName}
        </div>
        <h1 className="text-2xl font-semibold tracking-[0] text-foreground">{route.title}</h1>
        <p className="mt-1 max-w-[72ch] text-sm text-muted">{route.subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline">
          <SlidersHorizontal size={18} />
          Bộ lọc
        </Button>
        {route.primaryActionLabel ? (
          <Button disabled={!canCreate} title={canCreate ? undefined : "Tài khoản hiện tại chưa có quyền tạo/cập nhật"}>
            <Plus size={18} />
            {route.primaryActionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

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
    <div className="border-b border-border p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <label className="relative w-full xl:max-w-[420px]">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder={`Tìm kiếm ${route.title.toLowerCase()}`} value={search} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {route.filterLabels?.map((label) => (
            <span className="inline-flex h-10 items-center rounded-[8px] border border-border bg-white px-3 text-sm text-muted" key={label}>
              {label}
            </span>
          ))}
          <select
            aria-label="Lọc trạng thái"
            className="h-10 rounded-[8px] border border-border bg-white px-3 text-sm text-foreground"
            onChange={(event) => updateParam("status", event.target.value)}
            value={status}
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
        </div>
      </div>
    </div>
  );
}
