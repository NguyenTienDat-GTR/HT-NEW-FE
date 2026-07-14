"use client";

import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/ui/panel";
import { apiFetch, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { ResourcePagination } from "./resource-pagination";
import { ResourceTable } from "./resource-table";
import { ResourceFilters, ResourceHeader } from "./resource-toolbar";
import { useResourceQueryState } from "./use-resource-query-state";
import type { RouteConfig } from "@/features/workspace/routes";

export function ResourceView({ route }: { route: RouteConfig }) {
  const user = useAuthStore((state) => state.user);
  const queryState = useResourceQueryState(route);
  const query = useQuery({
    queryKey: ["resource", route.endpoint, queryState.queryString],
    enabled: Boolean(route.endpoint),
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>>>(`${route.endpoint}?${queryState.queryString}`),
  });

  const canCreate = route.actionPermissionPrefixes?.some((prefix) => hasPermissionPrefix(user, prefix)) ?? false;
  const rows = query.data?.content ?? [];

  return (
    <div className="space-y-5">
      <ResourceHeader canCreate={canCreate} route={route} />

      {route.workflowHint ? (
        <div className="rounded-[10px] border border-primary/20 bg-primary/6 px-4 py-3 text-sm text-foreground">{route.workflowHint}</div>
      ) : null}

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

        {!query.isLoading && rows.length === 0 ? (
          <div className="grid min-h-[220px] place-items-center px-4 text-center">
            <div>
              <p className="text-base font-semibold text-foreground">Chưa có dữ liệu phù hợp</p>
              <p className="mt-1 text-sm text-muted">Thử đổi bộ lọc hoặc từ khóa tìm kiếm để tải lại danh sách.</p>
            </div>
          </div>
        ) : null}

        {query.isError ? (
          <div className="mx-4 mb-4 rounded-[8px] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
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
    </div>
  );
}
