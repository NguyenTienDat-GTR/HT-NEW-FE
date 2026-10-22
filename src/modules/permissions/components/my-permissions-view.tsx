"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MagnifyingGlass, ShieldCheck, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ResourcePagination } from "@/components/common/resource/resource-pagination";
import type { ResourcePageSize } from "@/components/common/resource/use-resource-query-state";
import { Panel } from "@/components/ui/panel";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatVietnamDateTime } from "@/lib/date-format";
import { useSessionState } from "@/lib/use-session-state";
import { cn } from "@/lib/utils";
import { useMyPermissionFilterOptions, useMyPermissions, type MyPermission } from "../my-permissions-api";

type SourceFilter = "all" | "ROLE" | "ACCOUNT";

const selectClass = "h-10 rounded-lg border border-input bg-white px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]";

/** Danh sách quyền hiện có của tài khoản đang đăng nhập: chỉ xem; phân trang, sắp xếp, lọc và tìm kiếm do BE xử lý. */
export function MyPermissionsView() {
  const [keyword, setKeyword] = useSessionState("my-permissions:keyword", "");
  const [search, setSearch] = useState(keyword);
  const [source, setSource] = useSessionState<SourceFilter>("my-permissions:source", "all");
  const [moduleName, setModuleName] = useSessionState("my-permissions:module", "all");
  const [actionName, setActionName] = useSessionState("my-permissions:action", "all");
  const [page, setPage] = useState(0);
  const [size, setSize] = useSessionState<ResourcePageSize>("my-permissions:size", 10);
  const [sortBy, setSortBy] = useState("permissionName");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("ASC");
  const [selected, setSelected] = useState<MyPermission | null>(null);

  // Đợi người dùng ngừng gõ rồi mới gọi BE.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();
      if (next !== keyword) {
        setKeyword(next);
        setPage(0);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, search, setKeyword]);

  const query = useMyPermissions({
    page,
    size,
    search: keyword,
    sortBy,
    sortDirection,
    filters: {
      sourceType: source === "all" ? undefined : source,
      moduleName: moduleName === "all" ? undefined : moduleName,
      actionName: actionName === "all" ? undefined : actionName,
    },
  });
  const options = useMyPermissionFilterOptions().data;
  const rows = query.data?.content ?? [];

  function changeFilter(update: () => void) {
    update();
    setPage(0);
  }

  function toggleSort(field: string) {
    if (sortBy === field) setSortDirection((current) => (current === "ASC" ? "DESC" : "ASC"));
    else {
      setSortBy(field);
      setSortDirection("ASC");
    }
    setPage(0);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-8 tracking-[0] text-foreground">Quyền của tôi</h1>
        <p className="mt-1 max-w-[78ch] text-sm text-text-secondary">Các quyền đang có hiệu lực đối với tài khoản và vai trò của bạn. Trang này chỉ để xem.</p>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Tìm quyền</span>
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="h-10 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên quyền, mô tả, vai trò"
              value={search}
            />
          </label>
          <select aria-label="Nguồn quyền" className={selectClass} onChange={(event) => changeFilter(() => setSource(event.target.value as SourceFilter))} value={source}>
            <option value="all">Tất cả nguồn quyền</option>
            <option value="ROLE">Từ vai trò</option>
            <option value="ACCOUNT">Quyền riêng của tài khoản</option>
          </select>
          <select aria-label="Phân hệ" className={selectClass} onChange={(event) => changeFilter(() => setModuleName(event.target.value))} value={moduleName}>
            <option value="all">Tất cả phân hệ</option>
            {(options?.modules ?? []).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select aria-label="Hành động" className={selectClass} onChange={(event) => changeFilter(() => setActionName(event.target.value))} value={actionName}>
            <option value="all">Tất cả hành động</option>
            {(options?.actions ?? []).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {query.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="h-12 rounded-lg bg-surface-2 motion-safe:animate-pulse" key={index} />
            ))}
          </div>
        ) : null}
        {query.isError ? (
          <p className="p-5 text-sm text-danger" role="alert">
            {getApiErrorMessage(query.error)}
          </p>
        ) : null}
        {!query.isLoading && !query.isError && rows.length === 0 ? (
          <div className="grid min-h-[200px] place-items-center p-8 text-center text-sm text-muted">Không có quyền nào phù hợp.</div>
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <SortHeader className="px-5" field="permissionName" label="Quyền" onSort={toggleSort} sortBy={sortBy} sortDirection={sortDirection} />
                  <SortHeader field="moduleName" label="Phân hệ" onSort={toggleSort} sortBy={sortBy} sortDirection={sortDirection} />
                  <SortHeader field="actionName" label="Hành động" onSort={toggleSort} sortBy={sortBy} sortDirection={sortDirection} />
                  <SortHeader field="scopeName" label="Phạm vi" onSort={toggleSort} sortBy={sortBy} sortDirection={sortDirection} />
                  <SortHeader field="sourceType" label="Nguồn" onSort={toggleSort} sortBy={sortBy} sortDirection={sortDirection} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((item) => (
                  <tr className="cursor-pointer transition-colors hover:bg-slate-50" key={`${item.sourceType}-${item.roleCode ?? ""}-${item.permissionCode}`} onClick={() => setSelected(item)}>
                    <td className="px-5 py-3">
                      <button className="cursor-pointer text-left font-medium text-foreground" onClick={() => setSelected(item)} type="button">
                        {item.permissionName ?? item.permissionCode}
                      </button>
                      {item.resourceName ? <p className="text-xs text-muted">{item.resourceName}</p> : null}
                    </td>
                    <td className="px-3 py-3 text-text-secondary">{item.moduleName ?? "-"}</td>
                    <td className="px-3 py-3 text-text-secondary">{item.actionName ?? "-"}</td>
                    <td className="px-3 py-3 text-text-secondary">{item.scopeName ?? "-"}</td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", item.sourceType === "ROLE" ? "bg-surface-2 text-text-secondary" : "bg-primary-soft text-primary")}>
                        {item.sourceType === "ROLE" ? `Vai trò ${item.roleName ?? ""}`.trim() : "Quyền riêng"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <ResourcePagination
          data={query.data as never}
          page={page}
          size={size}
          updatePage={setPage}
          updatePageSize={(next) => {
            setSize(next);
            setPage(0);
          }}
        />
      </Panel>

      <PermissionDetailDialog item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SortHeader({
  className,
  field,
  label,
  onSort,
  sortBy,
  sortDirection,
}: {
  className?: string;
  field: string;
  label: string;
  onSort: (field: string) => void;
  sortBy: string;
  sortDirection: "ASC" | "DESC";
}) {
  const active = sortBy === field;
  return (
    <th aria-sort={active ? (sortDirection === "ASC" ? "ascending" : "descending") : "none"} className={cn("px-3 py-2.5", className)}>
      <button className="inline-flex cursor-pointer items-center gap-1 uppercase tracking-wide hover:text-foreground" onClick={() => onSort(field)} type="button">
        {label}
        <span aria-hidden className={cn("text-[10px]", active ? "text-primary" : "text-muted")}>
          {active ? (sortDirection === "ASC" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

function PermissionDetailDialog({ item, onClose }: { item: MyPermission | null; onClose: () => void }) {
  const rows: [string, string | null | undefined][] = item
    ? [
        ["Phân hệ", item.moduleName],
        ["Tài nguyên", item.resourceName],
        ["Hành động", item.actionName],
        ["Phạm vi", item.scopeName],
        ["Nguồn cấp", item.sourceType === "ROLE" ? `Vai trò ${item.roleName ?? ""}`.trim() : "Quyền riêng của tài khoản"],
        ["Ghi chú / lý do", item.note],
        ["Người phân quyền", item.assignedByName],
        ["Ngày phân quyền", formatVietnamDateTime(item.assignedAt)],
        ["Hết hạn", item.expiresAt ? formatVietnamDateTime(item.expiresAt) : "Không giới hạn"],
      ]
    : [];
  return (
    <Dialog.Root onOpenChange={(open) => (!open ? onClose() : undefined)} open={Boolean(item)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <ShieldCheck size={18} weight="fill" />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-base font-semibold leading-6 text-foreground">{item?.permissionName ?? item?.permissionCode}</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-[13px] leading-5 text-text-secondary">{item?.description ?? "Chi tiết quyền"}</Dialog.Description>
              </div>
            </div>
            <Dialog.Close aria-label="Đóng" className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-foreground">
              <X size={18} />
            </Dialog.Close>
          </div>
          <dl className="divide-y divide-slate-100 px-5">
            {rows
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div className="grid grid-cols-[140px_1fr] gap-3 py-2.5 text-sm" key={label}>
                  <dt className="text-text-secondary">{label}</dt>
                  <dd className="font-medium text-foreground">{value}</dd>
                </div>
              ))}
          </dl>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
