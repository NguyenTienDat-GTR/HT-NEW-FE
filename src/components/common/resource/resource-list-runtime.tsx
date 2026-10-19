"use client";

import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { rowsFromResponse } from "@/components/form/resource-form/api-utils";
import { apiFetch, apiMutation, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction } from "@/lib/auth/permissions";
import { resolveRouteForUser } from "@/modules/workspace/super-admin-route-overrides";
import { ApprovalDialog } from "./approval-dialog";
import { embeddedTabHref, useEmbeddedResource, withReturnTo } from "./embedded-resource-context";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { DetailDrawer } from "./detail-drawer";
import { getResourceId, isAwaitingApproval } from "./resource-actions";
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
  const embedded = useEmbeddedResource();
  const resolvedRoute = resolveRouteForUser(route, user);
  // Nhúng trong trang khác: bỏ bộ lọc cố định khỏi thanh lọc, form tạo mới quay về đúng tab và biết khóa đang chọn.
  const effectiveRoute = embedded
    ? {
        ...resolvedRoute,
        filters: (resolvedRoute.filters ?? []).filter((filter) => !(filter.key in embedded.fixedFilters)),
        createPath: resolvedRoute.createPath
          ? withReturnTo(resolvedRoute.createPath, embedded, embedded.fixedFilters["course.courseCode"] ? { courseCode: embedded.fixedFilters["course.courseCode"] } : {})
          : undefined,
      }
    : resolvedRoute;
  const queryState = useResourceQueryState(effectiveRoute, embedded?.fixedFilters);
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
      // Cache KPI để đổi bộ lọc qua lại không bắn lại hàng loạt request (tránh chạm giới hạn 429).
      staleTime: 60_000,
      placeholderData: keepPreviousData,
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
  const rejectId = searchParams.get("reject");
  const withdrawId = searchParams.get("withdraw");
  const removeId = searchParams.get("remove");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<"approve" | "reject" | null>(null);
  const canBulkApprove = Boolean(config.bulkApprovePath) && canUseAction(user, effectiveRoute.actions?.approve);
  const selectableIds = canBulkApprove
    ? rows.filter((row) => isAwaitingApproval(row)).flatMap((row) => {
        const id = getResourceId(effectiveRoute, row);
        return id ? [id] : [];
      })
    : [];

  const closeQueryDialog = () => router.push((embedded ? embeddedTabHref(embedded) : effectiveRoute.path) as Route);
  const actionMutation = useMutation({
    mutationFn: ({ action, id, note }: { action: "toggle" | "approve" | "reject" | "withdraw" | "remove"; id: string; note?: string }) => {
      if (action === "remove") return apiMutation(config.buildRemovePath?.(id) ?? `${effectiveRoute.endpoint}/${encodeURIComponent(id)}`, "DELETE");
      if (action === "withdraw") return apiMutation(config.buildWithdrawPath?.(id) ?? `${effectiveRoute.endpoint}/${encodeURIComponent(id)}`, "DELETE");
      if (action === "toggle") return apiMutation(`${effectiveRoute.endpoint}/${encodeURIComponent(id)}/toggle-status`, "PATCH", { confirmationText: "Xác nhận" });
      if (action === "approve" || action === "reject") {
        const approved = action === "approve";
        const approvePath = config.buildApprovePath?.(effectiveRoute, rows, id) ?? `${effectiveRoute.endpoint}/${encodeURIComponent(id)}/approve`;
        const approveBody = config.buildApproveBody?.(effectiveRoute, note, approved) ?? { approved, review: note || undefined };
        return apiMutation(approvePath, "POST", approveBody);
      }
      throw new Error("Unsupported resource action");
    },
    onSuccess: async (_data, variables) => {
      toast.success(variables.action === "toggle" ? "Đổi trạng thái thành công" : variables.action === "reject" ? "Đã từ chối duyệt" : variables.action === "withdraw" ? "Đã thu hồi đăng ký" : variables.action === "remove" ? "Đã xóa hồ sơ khỏi danh sách tham dự" : "Duyệt thành công");
      closeQueryDialog();
      await queryClient.invalidateQueries({ queryKey: ["resource", effectiveRoute.endpoint] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: ({ approved, note }: { approved: boolean; note: string }) =>
      apiMutation<{ successCount: number; failedCount: number; failures: { leaderFullName?: string; reason: string }[] }>(
        config.bulkApprovePath ?? "",
        "POST",
        { ids: selectedIds, approved, review: note || undefined },
      ),
    onSuccess: async (result, variables) => {
      const action = variables.approved ? "Duyệt" : "Từ chối";
      toast.success(`${action} ${result.successCount} hồ sơ thành công`);
      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} hồ sơ không xử lý được: ${result.failures.map((failure) => `${failure.leaderFullName ?? "Hồ sơ"} (${failure.reason})`).join("; ")}`);
      }
      setSelectedIds([]);
      setBulkMode(null);
      await queryClient.invalidateQueries({ queryKey: ["resource", effectiveRoute.endpoint] });
    },
  });
  const selection = canBulkApprove
    ? {
        selectedIds,
        selectableIds,
        onToggle: (id: string) => setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id])),
        onToggleAll: (on: boolean) => setSelectedIds(on ? selectableIds : []),
      }
    : undefined;

  return (
    <div className="space-y-5">
      <ResourceListHeader
        kpis={kpis}
        kpisLoading={query.isLoading || kpiQueries.some((kpiQuery) => kpiQuery.isLoading)}
        moduleLabel={config.moduleLabel}
        route={effectiveRoute}
        embedded={Boolean(embedded)}
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
        {canBulkApprove ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-1/60 px-4 py-2.5">
            <span className="text-sm text-muted">Đã chọn {selectedIds.filter((id) => selectableIds.includes(id)).length} hồ sơ</span>
            <Button disabled={selectedIds.length === 0} onClick={() => setBulkMode("approve")} size="sm" type="button">
              Duyệt đã chọn
            </Button>
            <Button disabled={selectedIds.length === 0} onClick={() => setBulkMode("reject")} size="sm" type="button" variant="outline">
              Từ chối đã chọn
            </Button>
          </div>
        ) : null}
        <ResourceTable
          selection={selection}
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
      <ApprovalDialog
        key={bulkMode ?? "bulk-closed"}
        loading={bulkMutation.isPending}
        mode={bulkMode === "reject" ? "reject" : "approve"}
        onClose={() => setBulkMode(null)}
        onConfirm={(note) => bulkMode && bulkMutation.mutate({ approved: bulkMode === "approve", note })}
        open={bulkMode !== null}
      />
      <ConfirmActionDialog
        action="withdraw"
        confirmLabel="Xóa"
        description="Hồ sơ sẽ bị xóa khỏi danh sách tham dự kể cả điểm đã nhập (nếu có). Không xóa được hồ sơ đã có chứng nhận."
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={() => removeId && actionMutation.mutate({ action: "remove", id: removeId })}
        open={Boolean(removeId)}
        requireConfirmText={false}
        title="Xóa khỏi danh sách tham dự"
      />
      <ConfirmActionDialog
        action="withdraw"
        confirmLabel="Thu hồi"
        description="Đăng ký sẽ bị xóa khỏi khóa huấn luyện và huynh trưởng có thể được đăng ký lại. Chỉ người gửi mới được thu hồi, và chỉ khi hồ sơ chưa được duyệt hoặc từ chối."
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={() => withdrawId && actionMutation.mutate({ action: "withdraw", id: withdrawId })}
        open={Boolean(withdrawId)}
        requireConfirmText={false}
        title="Thu hồi đăng ký"
      />
      <ApprovalDialog
        loading={actionMutation.isPending}
        mode="reject"
        onClose={closeQueryDialog}
        onConfirm={(note) => rejectId && actionMutation.mutate({ action: "reject", id: rejectId, note })}
        open={Boolean(rejectId)}
      />
    </div>
  );
}
