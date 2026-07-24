"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Panel } from "@/components/ui/panel";
import { rowsFromResponse } from "@/components/form/resource-form/api-utils";
import { apiFetch, apiMutation, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction } from "@/lib/auth/permissions";
import { resolveRouteForUser } from "@/modules/workspace/super-admin-route-overrides";
import { ApprovalDialog } from "./approval-dialog";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { DetailDrawer } from "./detail-drawer";
import { ResourceListEmptyState } from "./resource-list-empty-state";
import { ResourceListHeader } from "./resource-list-header";
import { buildResourceKpiQuerySpecs, buildResourceKpis, shouldShowResourceKpis } from "./resource-kpis";
import type { ResourceListRuntimeProps } from "./resource-list-types";
import { asPageResponse } from "./resource-list-utils";
import { ResourcePagination } from "./resource-pagination";
import { ResourceTable } from "./resource-table";
import { ResourceFilters } from "./resource-toolbar";
import { useResourceQueryState } from "./use-resource-query-state";

export function ResourceListRuntime({ route, config }: ResourceListRuntimeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const effectiveRoute = resolveRouteForUser(route, user);
  const queryState = useResourceQueryState(effectiveRoute);
  const query = useQuery({
    queryKey: ["resource", effectiveRoute.endpoint, queryState.queryString],
    enabled: Boolean(effectiveRoute.endpoint && user),
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>(`${effectiveRoute.endpoint}?${queryState.queryString}`),
    refetchOnMount: "always",
    retryOnMount: true,
    staleTime: 0,
  });

  const canCreate = canUseAction(user, effectiveRoute.actions?.create) && (config.canCreate?.(effectiveRoute, user) ?? true);
  const pageData = asPageResponse(query.data, queryState.size);
  const showKpis = shouldShowResourceKpis(effectiveRoute);
  const kpiQuerySpecs = buildResourceKpiQuerySpecs(effectiveRoute, queryState.queryString);
  const kpiQueries = useQueries({
    queries: kpiQuerySpecs.map((spec) => ({
      queryKey: ["resource-kpi", effectiveRoute.endpoint, spec.id, spec.queryString],
      enabled: Boolean(showKpis && effectiveRoute.endpoint && user),
      queryFn: () => apiFetch<PageResponse<Record<string, unknown>>>(`${effectiveRoute.endpoint}?${spec.queryString}`),
      staleTime: 0,
    })),
  });
  const kpiQueryTotals = Object.fromEntries(kpiQuerySpecs.map((spec, index) => [spec.id, kpiQueries[index]?.data?.totalElements ?? 0]));
  const kpis = buildResourceKpis({
    route: effectiveRoute,
    pageData,
    queryTotals: kpiQueryTotals,
  });
  const rows = rowsFromResponse(query.data);
  const detailId = searchParams.get("detail");
  const toggleId = searchParams.get("toggle");
  const approveId = searchParams.get("approve");

  const closeQueryDialog = () => router.push(effectiveRoute.path as Route);
  const actionMutation = useMutation({
    mutationFn: ({ action, id, note }: { action: "toggle" | "approve"; id: string; note?: string }) => {
      if (action === "toggle") return apiMutation(`${effectiveRoute.endpoint}/${encodeURIComponent(id)}/toggle-status`, "PATCH", { confirmationText: "Xác nhận" });
      if (action === "approve") {
        const approvePath = config.buildApprovePath?.(effectiveRoute, rows, id) ?? `${effectiveRoute.endpoint}/${encodeURIComponent(id)}/approve`;
        const approveBody = config.buildApproveBody?.(effectiveRoute, note) ?? { approved: true, review: note || undefined };
        return apiMutation(approvePath, "POST", approveBody);
      }
      throw new Error("Unsupported resource action");
    },
    onSuccess: async (_data, variables) => {
      toast.success(variables.action === "toggle" ? "Đổi trạng thái thành công" : "Duyệt thành công");
      closeQueryDialog();
      await queryClient.invalidateQueries({ queryKey: ["resource", effectiveRoute.endpoint] });
    },
  });

  return (
    <div className="space-y-5">
      <ResourceListHeader
        kpis={kpis}
        kpisLoading={query.isLoading || kpiQueries.some((kpiQuery) => kpiQuery.isLoading)}
        moduleLabel={config.moduleLabel}
        route={effectiveRoute}
      />

      <Panel className="overflow-hidden">
        <ResourceFilters
          filterValues={queryState.filterValues}
          route={effectiveRoute}
          search={queryState.search}
          setSearch={queryState.setSearch}
          status={queryState.status}
          updateFilter={queryState.updateFilter}
          updateParam={queryState.updateParam}
          resetFilters={queryState.resetFilters}
          canCreate={canCreate}
        />
        <ResourceTable
          isLoading={query.isLoading}
          route={effectiveRoute}
          rows={rows}
          size={queryState.size}
          sort={queryState.sort}
          sortBy={queryState.sortBy}
          sortDirection={queryState.sortDirection}
        />

        {!query.isLoading && rows.length === 0 ? <ResourceListEmptyState route={effectiveRoute} /> : null}

        {query.isError && !query.isFetching ? (
          <div className="mx-4 mb-4 rounded-[10px] border border-danger/30 bg-danger/5 p-3 text-sm font-medium text-danger">
            {getApiErrorMessage(query.error)}
          </div>
        ) : null}

        <ResourcePagination
          data={pageData}
          page={queryState.page}
          size={queryState.size}
          updatePage={queryState.updatePage}
          updatePageSize={queryState.updatePageSize}
        />
      </Panel>

      <DetailDrawer id={detailId} onClose={closeQueryDialog} route={effectiveRoute} />
      <ConfirmActionDialog
        action="toggle"
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={() => toggleId && actionMutation.mutate({ action: "toggle", id: toggleId })}
        open={Boolean(toggleId)}
        title="Đổi trạng thái bản ghi"
      />
      <ApprovalDialog
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={(note) => approveId && actionMutation.mutate({ action: "approve", id: approveId, note })}
        open={Boolean(approveId)}
      />
    </div>
  );
}
