"use client";

import { CaretDown, CheckCircle, Eye, PencilSimple, Trash } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { RouteConfig } from "@/features/workspace/routes";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction } from "@/lib/auth/permissions";
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-surface-1/80">
            {columns.map((column) => (
              <th className="h-13 border-b border-border px-4 font-semibold text-foreground" key={column}>
                <button className="inline-flex h-10 items-center gap-1 rounded-[8px] px-1 hover:text-primary" onClick={() => sort(column)} type="button">
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
            <th className="h-13 border-b border-border px-4 text-right font-semibold text-foreground">Thao tác</th>
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
        <td className="h-16 border-b border-surface-2 px-4" key={column}>
          <span className="block h-4 w-28 rounded bg-surface-2 motion-safe:animate-pulse" />
        </td>
      ))}
      <td className="h-16 border-b border-surface-2 px-4 text-right">
        <span className="ml-auto block h-10 w-24 rounded bg-surface-2 motion-safe:animate-pulse" />
      </td>
    </tr>
  ));
}

function ResourceRows({ columns, route, rows }: { columns: string[]; route: RouteConfig; rows: Record<string, unknown>[] }) {
  return rows.map((row, rowIndex) => (
    <tr className="group bg-white transition-colors hover:bg-primary/4" key={String(row.id ?? row.username ?? row.certificateCode ?? rowIndex)}>
      {columns.map((column) => (
        <td className="h-16 border-b border-surface-2 px-4 align-middle" key={column}>
          <ResourceCell column={column} row={row} value={row[column]} />
        </td>
      ))}
      <td className="h-16 border-b border-surface-2 px-4 text-right">
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
  const canEdit = canUseAction(user, route.actions?.edit);
  const canToggle = canUseAction(user, route.actions?.toggle);
  const canDelete = canUseAction(user, route.actions?.delete);
  const canScore = canUseAction(user, route.actions?.score);
  const canApprove = canUseAction(user, route.actions?.approve);

  return (
    <div className="inline-flex items-center gap-1">
      {canView ? (
        <Button asChild aria-label="Xem chi tiết" size="icon" variant="icon">
          <Link href={`${route.path}?detail=${encodeURIComponent(id)}` as Route}>
            <Eye size={16} />
          </Link>
        </Button>
      ) : null}
      {canEdit && editHref ? (
        <Button asChild aria-label="Sửa" size="icon" variant="icon">
          <Link href={editHref as Route}>
            <PencilSimple size={16} />
          </Link>
        </Button>
      ) : null}
      {canScore && scoreHref ? (
        <Button asChild aria-label="Chấm điểm" size="icon" variant="icon">
          <Link href={scoreHref as Route}>
            <PencilSimple size={16} />
          </Link>
        </Button>
      ) : null}
      {canApprove ? (
        <Button asChild aria-label="Duyệt" size="icon" variant="icon">
          <Link href={`${route.path}?approve=${encodeURIComponent(id)}` as Route}>
            <CheckCircle size={16} />
          </Link>
        </Button>
      ) : null}
      {canToggle ? <StatusSwitch active={row.status === true} href={`${route.path}?toggle=${encodeURIComponent(id)}` as Route} /> : null}
      {canDelete ? (
        <Button asChild aria-label="Xóa" size="icon" variant="ghost">
          <Link href={`${route.path}?delete=${encodeURIComponent(id)}` as Route}>
            <Trash size={16} />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function StatusSwitch({ active, href }: { active: boolean; href: Route }) {
  return (
    <Link
      aria-label={active ? "Tắt trạng thái" : "Bật trạng thái"}
      className={`inline-flex h-7 w-12 items-center rounded-full border px-0.5 transition-colors ${
        active ? "border-emerald-500 bg-emerald-500/15 justify-end" : "border-slate-300 bg-slate-200/70 justify-start"
      }`}
      href={href}
    >
      <span className={`block h-5 w-5 rounded-full shadow-sm ${active ? "bg-emerald-600" : "bg-white"}`} />
    </Link>
  );
}
