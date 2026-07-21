"use client";

import { CaretDown, CheckCircle, Eye, PencilSimple } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { RouteConfig } from "@/config/routes/routes";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";
import { canUseAction, isSuperAdmin } from "@/lib/auth/permissions";
import { columnLabels, ResourceCell } from "./resource-format";
import { fillRoute, getResourceId } from "./resource-actions";
import type { ResourcePageSize } from "./use-resource-query-state";

export function ResourceTable({
  columns,
  isLoading,
  rows,
  route,
  size,
  sort,
  sortBy,
  sortDirection,
}: {
  columns: RouteConfig["columns"];
  isLoading: boolean;
  rows: Record<string, unknown>[];
  route: RouteConfig;
  size: ResourcePageSize;
  sort: (column: string) => void;
  sortBy?: string;
  sortDirection: "ASC" | "DESC";
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left text-xs">
        <thead>
          <tr className="bg-surface-1/90">
            {columns.map((column) => (
              <th className="sticky top-0 z-10 h-10 border-b border-border bg-surface-1/95 px-3 font-semibold text-foreground" key={column}>
                <button className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-[8px] px-1 transition-colors hover:text-primary" onClick={() => sort(column)} type="button">
                  {columnLabels[column] ?? column}
                  {sortBy === column ? (
                    <span className="inline-flex items-center gap-0.5 text-xs text-primary">
                      <CaretDown className={sortDirection === "ASC" ? "rotate-180" : undefined} size={12} weight="bold" />
                      {sortDirection}
                    </span>
                  ) : null}
                </button>
              </th>
            ))}
            <th className="h-10 border-b border-border px-3 text-right font-semibold text-foreground">Thao tác</th>
          </tr>
        </thead>
        <tbody>{isLoading ? <ResourceTableSkeleton columns={columns} size={size} /> : <ResourceRows columns={columns} route={route} rows={rows} />}</tbody>
      </table>
    </div>
  );
}

function ResourceTableSkeleton({ columns, size }: { columns: string[]; size: ResourcePageSize }) {
  return Array.from({ length: size }).map((_, rowIndex) => (
    <tr key={rowIndex}>
      {columns.map((column) => (
        <td className="h-12 border-b border-surface-2 px-3" key={column}>
          <span className="block h-3 w-24 rounded bg-surface-2 motion-safe:animate-pulse" />
        </td>
      ))}
      <td className="sticky right-0 h-12 border-b border-surface-2 bg-white px-3 text-right shadow-[var(--shadow-table-sticky)]">
        <span className="ml-auto block h-8 w-20 rounded bg-surface-2 motion-safe:animate-pulse" />
      </td>
    </tr>
  ));
}

function ResourceRows({ columns, route, rows }: { columns: string[]; route: RouteConfig; rows: Record<string, unknown>[] }) {
  return rows.map((row, rowIndex) => (
    <tr className="group bg-white transition-colors hover:bg-primary/4" key={String(row.id ?? row.username ?? row.certificateCode ?? rowIndex)}>
      {columns.map((column) => (
        <td className="h-12 border-b border-surface-2 px-3 align-middle" key={column}>
          <ResourceCell column={column} row={row} value={row[column]} />
        </td>
      ))}
      <td className="sticky right-0 h-12 border-b border-surface-2 bg-white px-3 text-right shadow-[var(--shadow-table-sticky)] transition-colors group-hover:bg-primary-soft">
        <RowActions route={route} row={row} />
      </td>
    </tr>
  ));
}

function RowActions({ route, row }: { route: RouteConfig; row: Record<string, unknown> }) {
  const user = useAuthStore((state) => state.user);
  const id = getResourceId(route, row);
  if (!id) return <span className="text-xs text-muted">-</span>;

  const editHref = fillRoute(route.editPath, { id });
  const scoreHref = fillRoute(route.actions?.score?.route, { id });
  const canView = canUseAction(user, route.actions?.view);
  const canEdit = canUseAction(user, route.actions?.edit) && canEditRow(route, row, user);
  const canToggle = canUseAction(user, route.actions?.toggle) && canToggleRow(route, row, user);
  const canScore = canUseAction(user, route.actions?.score);
  const canApprove = canUseAction(user, route.actions?.approve);

  return (
    <div className="inline-flex items-center gap-1">
      {canView ? (
        <Button asChild aria-label="Xem chi tiết" className="h-8 min-w-8 rounded-[8px]" size="icon" variant="icon">
          <Link href={`${route.path}?detail=${encodeURIComponent(id)}` as Route}>
            <Eye size={16} />
          </Link>
        </Button>
      ) : null}
      {canEdit && editHref ? (
        <Button asChild aria-label="Sửa" className="h-8 min-w-8 rounded-[8px]" size="icon" variant="icon">
          <Link href={editHref as Route}>
            <PencilSimple size={16} />
          </Link>
        </Button>
      ) : null}
      {canScore && scoreHref ? (
        <Button asChild aria-label="Chấm điểm" className="h-8 min-w-8 rounded-[8px]" size="icon" variant="icon">
          <Link href={scoreHref as Route}>
            <PencilSimple size={16} />
          </Link>
        </Button>
      ) : null}
      {canApprove ? (
        <Button asChild aria-label="Duyệt" className="h-8 min-w-8 rounded-[8px]" size="icon" variant="icon">
          <Link href={`${route.path}?approve=${encodeURIComponent(id)}` as Route}>
            <CheckCircle size={16} />
          </Link>
        </Button>
      ) : null}
      {canToggle ? <StatusSwitch active={isToggleActive(route, row)} href={`${route.path}?toggle=${encodeURIComponent(id)}` as Route} /> : null}
    </div>
  );
}

function canEditRow(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  if (route.kind === "accounts") return false;
  if (!isSuperAdmin(user)) return true;
  return route.kind !== "dioceses" && route.kind !== "deaneries" && route.kind !== "parishes";
}

function canToggleRow(route: RouteConfig, row: Record<string, unknown>, user: AuthUser | null) {
  if (route.kind === "roles" && row.isSystem === true) return false;
  if (route.kind === "accounts") return !isOwnAccount(row, user) && !rowHasPrimaryRole(row, "SUPER_ADMIN");
  if (!isSuperAdmin(user)) return true;
  return route.kind === "dioceses";
}

function isOwnAccount(row: Record<string, unknown>, user: AuthUser | null) {
  return typeof row.username === "string" && row.username === user?.username;
}

function rowHasPrimaryRole(row: Record<string, unknown>, roleCode: string) {
  return row.primaryRoleCode === roleCode;
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
      className={`inline-flex h-7 w-12 items-center rounded-full border px-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active ? "justify-end border-success bg-success/15 hover:bg-success/20" : "justify-start border-slate-300 bg-slate-200/70 hover:bg-slate-200"
      }`}
      href={href}
    >
      <span className={`block h-5 w-5 rounded-full shadow-sm ${active ? "bg-success" : "bg-white"}`} />
    </Link>
  );
}
