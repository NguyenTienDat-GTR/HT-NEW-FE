"use client";

import { Plus } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { apiFetch, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import type { RouteConfig } from "@/features/workspace/routes";
import { ResourcePagination } from "./resource-pagination";
import { ResourceTable } from "./resource-table";
import { ResourceFilters } from "./resource-toolbar";
import { useResourceQueryState } from "./use-resource-query-state";

type Tone = "violet" | "blue" | "emerald" | "amber" | "rose";

type SummaryItem = {
  label: string;
  value: string;
  caption?: string;
  tone?: Tone;
};

type ResourceListPageProps = {
  route: RouteConfig;
  moduleLabel: string;
  moduleDescription: string;
  tone?: Tone;
  buildSummary?: (data?: PageResponse<Record<string, unknown>>) => SummaryItem[];
  sidePanel?: React.ReactNode;
  children?: React.ReactNode;
};

export function ResourceListPage({ route, moduleLabel, moduleDescription, children }: ResourceListPageProps) {
  const user = useAuthStore((state) => state.user);
  const queryState = useResourceQueryState(route);
  const query = useQuery({
    queryKey: ["resource", route.endpoint, queryState.queryString],
    enabled: Boolean(route.endpoint),
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>>>(`${route.endpoint}?${queryState.queryString}`),
  });

  const primaryActionPermissionPrefixes =
    route.primaryActionPermissionPrefixes ??
    route.actionPermissionPrefixes?.filter((prefix) => prefix.includes(".create.") || prefix.includes(".manage."));
  const canCreate = primaryActionPermissionPrefixes?.some((prefix) => hasPermissionPrefix(user, prefix)) ?? false;
  const rows = query.data?.content ?? [];

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <span>Trang chủ</span>
            <span aria-hidden>›</span>
            <span>{moduleLabel}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[0] text-foreground">{route.title}</h1>
          <p className="mt-2 max-w-[82ch] text-sm leading-6 text-muted">{route.subtitle || moduleDescription}</p>
        </div>
        {route.primaryActionLabel && canCreate ? (
          <Button disabled={!canCreate} title={canCreate ? undefined : "Tài khoản hiện tại chưa có quyền tạo/cập nhật"}>
            <Plus size={18} />
            {route.primaryActionLabel}
          </Button>
        ) : null}
      </section>

      <Panel className="overflow-hidden">
        <ResourceFilters
          route={route}
          search={queryState.search}
          setSearch={queryState.setSearch}
          status={queryState.status}
          updateParam={queryState.updateParam}
        />
        <ResourceTable
          columns={route.columns}
          isLoading={query.isLoading}
          rows={rows}
          size={queryState.size}
          sort={queryState.sort}
          sortBy={queryState.sortBy}
          sortDirection={queryState.sortDirection}
        />

        {!query.isLoading && rows.length === 0 ? <EmptyState route={route} /> : null}

        {query.isError ? (
          <div className="mx-4 mb-4 rounded-[10px] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            {getApiErrorMessage(query.error)}
          </div>
        ) : null}

        <ResourcePagination
          data={query.data}
          page={queryState.page}
          size={queryState.size}
          updatePage={queryState.updatePage}
          updatePageSize={queryState.updatePageSize}
        />
      </Panel>

      {children}
    </div>
  );
}

export function ModuleSidePanel(_props: {
  title?: string;
  description?: string;
  items?: Array<{ label: string; value: string }>;
  tone?: Tone;
}) {
  void _props;
  return null;
}

function EmptyState({ route }: { route: RouteConfig }) {
  return (
    <div className="grid min-h-[220px] place-items-center px-4 text-center">
      <div>
        <p className="text-base font-semibold text-foreground">Chưa có dữ liệu phù hợp</p>
        <p className="mt-1 max-w-[48ch] text-sm leading-6 text-muted">
          Thử đổi bộ lọc hoặc từ khóa tìm kiếm để tải lại danh sách {route.title.toLowerCase()}.
        </p>
      </div>
    </div>
  );
}
