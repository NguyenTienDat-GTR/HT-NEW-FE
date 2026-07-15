"use client";

import { Plus } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { apiFetch, apiMutation, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction } from "@/lib/auth/permissions";
import type { RouteConfig } from "@/features/workspace/routes";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { ApprovalDialog } from "./approval-dialog";
import { DetailDrawer } from "./detail-drawer";
import { rowsFromResponse } from "@/features/forms/api-utils";
import { getResourceId } from "./resource-actions";
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

function asPageResponse(data: PageResponse<Record<string, unknown>> | Record<string, unknown>[] | undefined, size: number): PageResponse<Record<string, unknown>> | undefined {
  if (!data) return undefined;
  if (!Array.isArray(data)) return data;
  return {
    content: data,
    totalElements: data.length,
    totalPages: 1,
    size,
    number: 0,
    first: true,
    last: true,
  };
}

export function ResourceListPage({ route, moduleLabel, moduleDescription, children }: ResourceListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const queryState = useResourceQueryState(route);
  const query = useQuery({
    queryKey: ["resource", route.endpoint, queryState.queryString],
    enabled: Boolean(route.endpoint),
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>(`${route.endpoint}?${queryState.queryString}`),
  });

  const canCreate = canUseAction(user, route.actions?.create);
  const pageData = asPageResponse(query.data, queryState.size);
  const rows = rowsFromResponse(query.data);
  const detailId = searchParams.get("detail");
  const toggleId = searchParams.get("toggle");
  const deleteId = searchParams.get("delete");
  const approveId = searchParams.get("approve");

  const closeQueryDialog = () => router.push(route.path as Route);
  const actionMutation = useMutation({
    mutationFn: ({ action, id, note }: { action: "toggle" | "delete" | "approve"; id: string; note?: string }) => {
      if (action === "toggle") return apiMutation(`${route.endpoint}/${encodeURIComponent(id)}/toggle-status`, "PATCH", { confirmationText: "Xác nhận" });
      if (action === "approve") return apiMutation(buildApprovePath(route, rows, id), "POST", buildApproveBody(route, note));
      return apiMutation(`${route.endpoint}/${encodeURIComponent(id)}`, "DELETE");
    },
    onSuccess: async (_data, variables) => {
      toast.success(variables.action === "toggle" ? "Đổi trạng thái thành công" : variables.action === "approve" ? "Duyệt thành công" : "Xóa thành công");
      closeQueryDialog();
      await queryClient.invalidateQueries({ queryKey: ["resource", route.endpoint] });
    },
  });

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
        {route.primaryActionLabel && route.createPath && canCreate ? (
          <Button asChild title={canCreate ? undefined : "Tài khoản hiện tại chưa có quyền tạo/cập nhật"}>
            <Link href={route.createPath as Route}>
              <Plus size={18} />
              {route.primaryActionLabel}
            </Link>
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
          route={route}
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
          data={pageData}
          page={queryState.page}
          size={queryState.size}
          updatePage={queryState.updatePage}
          updatePageSize={queryState.updatePageSize}
        />
      </Panel>

      <DetailDrawer id={detailId} onClose={closeQueryDialog} route={route} />
      <ConfirmActionDialog
        action="toggle"
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={() => toggleId && actionMutation.mutate({ action: "toggle", id: toggleId })}
        open={Boolean(toggleId)}
        title="Đổi trạng thái bản ghi"
      />
      <ConfirmActionDialog
        action="delete"
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={() => deleteId && actionMutation.mutate({ action: "delete", id: deleteId })}
        open={Boolean(deleteId)}
        title="Xóa bản ghi"
      />
      <ApprovalDialog
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={(note) => approveId && actionMutation.mutate({ action: "approve", id: approveId, note })}
        open={Boolean(approveId)}
      />

      {children}
    </div>
  );
}

function buildApprovePath(route: RouteConfig, rows: Record<string, unknown>[], id: string) {
  if (route.kind === "certificates") return `/certificates/${encodeURIComponent(id)}/approve`;
  const row = rows.find((candidate) => getResourceId(route, candidate) === id);
  const deaneryStatus = String(row?.deaneryApprovalStatus ?? "");
  if (deaneryStatus === "PENDING" || deaneryStatus === "SUBMITTED") return `/training/registrations/${encodeURIComponent(id)}/deanery-approval`;
  return `/training/registrations/${encodeURIComponent(id)}/diocese-approval`;
}

function buildApproveBody(route: RouteConfig, note?: string) {
  if (route.kind === "certificates") return { approvalReason: note || undefined };
  return { approved: true, review: note || undefined };
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
        <p className="mt-1 max-w-[48ch] text-sm leading-6 text-muted">Thử đổi bộ lọc hoặc từ khóa tìm kiếm để tải lại danh sách {route.title.toLowerCase()}.</p>
      </div>
    </div>
  );
}
