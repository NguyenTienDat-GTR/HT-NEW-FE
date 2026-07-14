"use client";

import { DotsThree, PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { columnLabels, ResourceCell } from "./resource-format";
import type { ResourcePageSize } from "./use-resource-query-state";
import type { RouteConfig } from "@/features/workspace/routes";

export function ResourceTable({
  columns,
  isLoading,
  rows,
  size,
  sort,
  sortBy,
  sortDirection,
}: {
  columns: RouteConfig["columns"];
  isLoading: boolean;
  rows: Record<string, unknown>[];
  size: ResourcePageSize;
  sort: (column: string) => void;
  sortBy?: string;
  sortDirection: "ASC" | "DESC";
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-surface-1">
            {columns.map((column) => (
              <th className="h-12 border-b border-border px-4 font-semibold text-foreground" key={column}>
                <button className="inline-flex h-10 items-center gap-1 rounded-[8px] px-1" onClick={() => sort(column)} type="button">
                  {columnLabels[column] ?? column}
                  {sortBy === column ? <span className="text-xs text-primary">{sortDirection}</span> : null}
                </button>
              </th>
            ))}
            <th className="h-12 border-b border-border px-4 text-right font-semibold text-foreground">Thao tác</th>
          </tr>
        </thead>
        <tbody>{isLoading ? <ResourceTableSkeleton columns={columns} size={size} /> : <ResourceRows columns={columns} rows={rows} />}</tbody>
      </table>
    </div>
  );
}

function ResourceTableSkeleton({ columns, size }: { columns: string[]; size: ResourcePageSize }) {
  return Array.from({ length: size }).map((_, rowIndex) => (
    <tr key={rowIndex}>
      {columns.map((column) => (
        <td className="h-14 border-b border-surface-2 px-4" key={column}>
          <span className="block h-4 w-28 rounded bg-surface-2 motion-safe:animate-pulse" />
        </td>
      ))}
      <td className="h-14 border-b border-surface-2 px-4 text-right">
        <span className="ml-auto block h-9 w-20 rounded bg-surface-2 motion-safe:animate-pulse" />
      </td>
    </tr>
  ));
}

function ResourceRows({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) {
  return rows.map((row, rowIndex) => (
    <tr className="hover:bg-surface-1" key={String(row.id ?? row.username ?? row.certificateCode ?? rowIndex)}>
      {columns.map((column) => (
        <td className="h-14 border-b border-surface-2 px-4 align-middle" key={column}>
          <ResourceCell column={column} row={row} value={row[column]} />
        </td>
      ))}
      <td className="h-14 border-b border-surface-2 px-4 text-right">
        <div className="inline-flex items-center gap-1">
          <Button size="sm" variant="ghost">
            <PencilSimple size={16} />
            Sửa
          </Button>
          <Button aria-label="Mở thêm thao tác" size="icon" variant="ghost">
            <DotsThree size={20} weight="bold" />
          </Button>
        </div>
      </td>
    </tr>
  ));
}
