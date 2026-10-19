"use client";

import { ArrowUUpLeftIcon, CaretDownIcon, CheckCircleIcon, EyeIcon, PencilSimpleIcon, TrashIcon, XCircleIcon } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { RouteConfig } from "@/config/routes/routes";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";
import { canUseAction, isSuperAdmin } from "@/lib/auth/permissions";
import { columnLabels, ResourceCell } from "./resource-format";
import { useEmbeddedResource, resourceActionHref, withReturnTo } from "./embedded-resource-context";
import { fillRoute, getResourceId, isAwaitingApproval } from "./resource-actions";
import { RegistrationToggleButton } from "@/modules/training-courses/components/registration-toggle-button";
import type { ResourcePageSize } from "./use-resource-query-state";

const systemRoleCodes = new Set(["SUPER_ADMIN", "ADMIN_DIOCESE", "ADMIN_DEANERY", "ADMIN_PARISH"]);

export function ResourceTable({
  isLoading,
  rows,
  route,
  size,
  sort,
  sortBy,
  sortDirection,
  selection,
}: {
  // Chọn nhiều hồ sơ để duyệt/từ chối hàng loạt.
  selection?: { selectedIds: string[]; selectableIds: string[]; onToggle: (id: string) => void; onToggleAll: (on: boolean) => void };
  isLoading: boolean;
  rows: Record<string, unknown>[];
  route: RouteConfig;
  size: ResourcePageSize;
  sort: (column: string) => void;
  sortBy?: string;
  sortDirection: "ASC" | "DESC";
}) {
  const user = useAuthStore((state) => state.user);
  const visibleColumns = visibleResourceColumns(route, rows, user);

  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-270 border-separate border-spacing-0 text-left text-xs">
        <thead>
          <tr className="bg-surface-1/90">
            {selection ? (
              <th className="sticky top-0 z-10 h-10 w-10 border-b border-border bg-surface-1/95 px-3">
                <input
                  aria-label="Chọn tất cả hồ sơ đang chờ duyệt"
                  checked={selection.selectableIds.length > 0 && selection.selectableIds.every((id) => selection.selectedIds.includes(id))}
                  className="h-4 w-4 accent-primary"
                  disabled={selection.selectableIds.length === 0}
                  onChange={(event) => selection.onToggleAll(event.target.checked)}
                  type="checkbox"
                />
              </th>
            ) : null}
            {visibleColumns.map((column) => (
              <th className="sticky top-0 z-10 h-10 border-b border-border bg-surface-1/95 px-3 font-semibold text-foreground" key={column}>
                <button className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-1 transition-colors hover:text-primary" onClick={() => sort(column)} type="button">
                  {columnLabels[column] ?? column}
                  {sortBy === column ? (
                    <span className="inline-flex items-center gap-0.5 text-xs text-primary">
                      <CaretDownIcon className={sortDirection === "ASC" ? "rotate-180" : undefined} size={12} weight="bold" />
                      {sortDirection}
                    </span>
                  ) : null}
                </button>
              </th>
            ))}
            <th className="h-10 border-b border-border px-3 text-right font-semibold text-foreground">Thao tác</th>
          </tr>
        </thead>
        <tbody>{isLoading ? <ResourceTableSkeleton columns={visibleColumns} size={size} /> : <ResourceRows columns={visibleColumns} route={route} rows={rows} selection={selection} />}</tbody>
      </table>
    </div>
  );
}

export function shouldHideStatusColumn(route: RouteConfig, rows: Record<string, unknown>[], user: AuthUser | null) {
  if (!route.columns.includes("status")) return false;
  return rows.some((row) => canShowToggleSwitch(route, row, user));
}

export function visibleResourceColumns(route: RouteConfig, rows: Record<string, unknown>[], user: AuthUser | null) {
  return shouldHideStatusColumn(route, rows, user) ? route.columns.filter((column) => column !== "status") : route.columns;
}

function ResourceTableSkeleton({ columns, size }: { columns: string[]; size: ResourcePageSize }) {
  return Array.from({ length: size }).map((_, rowIndex) => (
    <tr key={rowIndex}>
      {columns.map((column) => (
        <td className="h-12 border-b border-surface-2 px-3" key={column}>
          <span className="block h-3 w-24 rounded bg-surface-2 motion-safe:animate-pulse" />
        </td>
      ))}
      <td className="sticky right-0 h-12 border-b border-surface-2 bg-white px-3 text-right shadow-(--shadow-table-sticky)">
        <span className="ml-auto block h-8 w-20 rounded bg-surface-2 motion-safe:animate-pulse" />
      </td>
    </tr>
  ));
}

function ResourceRows({
  columns,
  route,
  rows,
  selection,
}: {
  columns: string[];
  route: RouteConfig;
  rows: Record<string, unknown>[];
  selection?: { selectedIds: string[]; selectableIds: string[]; onToggle: (id: string) => void; onToggleAll: (on: boolean) => void };
}) {
  return rows.map((row, rowIndex) => {
    const rowId = getResourceId(route, row);
    const selectable = Boolean(selection && rowId && selection.selectableIds.includes(rowId));
    return (
    <tr className="group bg-white transition-colors hover:bg-primary/4" key={String(row.id ?? row.username ?? row.certificateCode ?? rowIndex)}>
      {selection ? (
        <td className="h-12 w-10 border-b border-surface-2 px-3 align-middle">
          {selectable && rowId ? (
            <input
              aria-label="Chọn hồ sơ"
              checked={selection.selectedIds.includes(rowId)}
              className="h-4 w-4 accent-primary"
              onChange={() => selection.onToggle(rowId)}
              type="checkbox"
            />
          ) : null}
        </td>
      ) : null}
      {columns.map((column) => (
        <td className="h-12 border-b border-surface-2 px-3 align-middle" key={column}>
          <ResourceCell column={column} row={row} value={row[column]} />
        </td>
      ))}
      <td className="sticky right-0 h-12 border-b border-surface-2 bg-white px-3 text-right shadow-(--shadow-table-sticky) transition-colors group-hover:bg-primary-soft">
        <RowActions route={route} row={row} />
      </td>
    </tr>
    );
  });
}

function RowActions({ route, row }: { route: RouteConfig; row: Record<string, unknown> }) {
  const user = useAuthStore((state) => state.user);
  const embedded = useEmbeddedResource();
  const id = getResourceId(route, row);
  if (!id) return <span className="text-xs text-muted">-</span>;

  const editHref = fillRoute(route.editPath, { id });
  const detailHref = fillRoute(route.detailPath, { id });
  const scoreHref = fillRoute(route.actions?.score?.route, { id });
  const canView = canUseAction(user, route.actions?.view);
  const canEdit = canShowEditAction(route, row, user);
  const canToggle = canUseAction(user, route.actions?.toggle) && canToggleRow(route, row, user);
  const canScore = canUseAction(user, route.actions?.score);
  // Hồ sơ tham dự chỉ duyệt/từ chối khi đang chờ duyệt.
  const awaitingApproval = route.kind !== "participations" || isAwaitingApproval(row);
  // Chỉ người gửi đăng ký mới thu hồi được, và chỉ khi hồ sơ còn chờ duyệt (chưa duyệt hoặc từ chối).
  const actorId = user?.leaderId || user?.username;
  const canWithdraw = canUseAction(user, route.actions?.withdraw) && Boolean(actorId) && row.createdBy === actorId && isAwaitingApproval(row);
  const canApprove = canUseAction(user, route.actions?.approve) && awaitingApproval;
  // Hồ sơ đã có chứng nhận được duyệt thì không xóa được.
  const canRemove = canUseAction(user, route.actions?.remove) && row.certificateApprovalStatus !== "APPROVED";
  const canReject = canUseAction(user, route.actions?.reject) && awaitingApproval;

  return (
    <div className="inline-flex items-center gap-1">
      {canView ? (
        <Button asChild aria-label="Xem chi tiết" className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
          <Link href={(detailHref ?? resourceActionHref(route.path, embedded, { detail: id })) as Route}>
            <EyeIcon size={16} />
          </Link>
        </Button>
      ) : null}
      {canEdit && editHref ? (
        <Button asChild aria-label="Sửa" className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
          <Link href={editHref as Route}>
            <PencilSimpleIcon size={16} />
          </Link>
        </Button>
      ) : null}
      {route.kind === "courses" && canEdit ? <RegistrationToggleButton endpoint={route.endpoint ?? ""} id={id} row={row} /> : null}
      {canScore && scoreHref ? (
        <Button asChild aria-label="Chấm điểm" className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
          <Link href={withReturnTo(scoreHref, embedded) as Route}>
            <PencilSimpleIcon size={16} />
          </Link>
        </Button>
      ) : null}
      {canApprove ? (
        <Button asChild aria-label="Duyệt" className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
          <Link href={resourceActionHref(route.path, embedded, { approve: id }) as Route}>
            <CheckCircleIcon size={16} />
          </Link>
        </Button>
      ) : null}
      {canWithdraw ? (
        <Button asChild aria-label="Thu hồi đăng ký" className="h-8 min-w-8 rounded-lg" size="icon" variant="icon">
          <Link href={resourceActionHref(route.path, embedded, { withdraw: id }) as Route}>
            <ArrowUUpLeftIcon size={16} />
          </Link>
        </Button>
      ) : null}
      {canRemove ? (
        <Button asChild aria-label="Xóa khỏi danh sách tham dự" className="h-8 min-w-8 rounded-lg text-danger" size="icon" variant="icon">
          <Link href={resourceActionHref(route.path, embedded, { remove: id }) as Route}>
            <TrashIcon size={16} />
          </Link>
        </Button>
      ) : null}
      {canReject ? (
        <Button asChild aria-label="Từ chối" className="h-8 min-w-8 rounded-lg text-danger" size="icon" variant="icon">
          <Link href={resourceActionHref(route.path, embedded, { reject: id }) as Route}>
            <XCircleIcon size={16} />
          </Link>
        </Button>
      ) : null}
      {canToggle ? <StatusSwitch active={isToggleActive(route, row)} href={resourceActionHref(route.path, embedded, { toggle: id }) as Route} /> : null}
    </div>
  );
}

function canEditRow(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  if (route.kind === "accounts") return false;
  if (route.kind === "leaders") return false;
  if (!isSuperAdmin(user) && isSystemRoleRow(route, row)) return false;
  if (!isSuperAdmin(user)) return true;
  return route.kind !== "dioceses" && route.kind !== "deaneries" && route.kind !== "parishes";
}

export function canShowEditAction(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  return canUseAction(user, route.actions?.edit) && canEditRow(route, row, user);
}

function canToggleRow(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  if (!isSuperAdmin(user) && isSystemRoleRow(route, row)) return false;
  if (route.kind === "accounts") return !isOwnAccount(row, user) && !rowHasPrimaryRole(row, "SUPER_ADMIN");
  if (route.kind === "dioceses") return isSuperAdmin(user);
  if (route.kind === "deaneries") return hasRole(user, "ADMIN_DIOCESE");
  if (route.kind === "parishes") return hasRole(user, "ADMIN_DEANERY");
  if (!isSuperAdmin(user)) return true;
  return route.kind === "permissions" || route.kind === "account-roles";
}

function isSystemRoleRow(route: RouteConfig, row: Record<string, unknown>) {
  if (route.kind === "roles") return row.isSystem === true;
  if (route.kind !== "role-permissions") return false;
  return row.roleIsSystem === true || (typeof row.roleCode === "string" && systemRoleCodes.has(row.roleCode));
}

function isOwnAccount(row: Record<string, unknown>, user: AuthUser | null) {
  return typeof row.username === "string" && row.username === user?.username;
}

function rowHasPrimaryRole(row: Record<string, unknown>, roleCode: string) {
  return row.primaryRoleCode === roleCode;
}

function hasRole(user: AuthUser | null, roleCode: string) {
  return Boolean(user?.roles.some((role) => role === roleCode || role === `ROLE_${roleCode}`));
}

function canShowToggleSwitch(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  return Boolean(getResourceId(route, row)) && canUseAction(user, route.actions?.toggle) && canToggleRow(route, row, user);
}

function isToggleActive(route: RouteConfig, row: Record<string, unknown>) {
  if (route.kind === "role-permissions" || route.kind === "account-permissions") {
    return row.effect !== "DENY";
  }
  return row.status === true;
}

function StatusSwitch({ active, href }: { active: boolean; href: Route }) {
  return (
    <Link
      aria-label={active ? "Tắt trạng thái" : "Bật trạng thái"}
      className={`inline-flex h-7 w-12 items-center rounded-full border px-0.5 transition-colors focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active
          ? "justify-end border-(--toggle-active) bg-(--toggle-active-surface) hover:bg-(--toggle-active-surface-hover)"
          : "justify-start border-(--toggle-inactive) bg-(--toggle-inactive-surface) hover:bg-(--toggle-inactive-surface-hover)"
      }`}
      href={href}
    >
      <span className={`block h-5 w-5 rounded-full shadow-sm ${active ? "bg-(--toggle-active)" : "bg-(--toggle-thumb)"}`} />
    </Link>
  );
}
