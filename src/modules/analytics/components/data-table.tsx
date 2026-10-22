"use client";

import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/modules/analytics/components/section-card";

export type Column<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
  /** Có giá trị sắp xếp thì cột bấm được để sắp xếp. */
  sort?: (row: T) => number | string | null;
  className?: string;
};

type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  initialSort?: { key: string; direction: "asc" | "desc" };
  pageSize?: number;
  ariaLabel: string;
};

/** Bảng có sắp xếp tại chỗ; null luôn xếp cuối để dòng chưa có dữ liệu không chiếm đầu bảng. */
export function DataTable<T>({ rows, columns, rowKey, onRowClick, initialSort, pageSize = 10, ariaLabel }: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [limit, setLimit] = useState(pageSize);

  const sorted = useMemo(() => {
    const column = columns.find((item) => item.key === sort?.key);
    if (!sort || !column?.sort) return rows;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = column.sort!(a);
      const right = column.sort!(b);
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      return (typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "vi")) * factor;
    });
  }, [rows, columns, sort]);

  if (!rows.length) return <EmptyState />;

  const toggle = (key: string) => setSort((current) => (current?.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "desc" }));

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table aria-label={ariaLabel} className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-surface-1">
              {columns.map((column) => {
                const active = sort?.key === column.key;
                return (
                  <th aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined} className={cn("border-b border-border px-3 py-2.5 text-xs font-semibold text-muted", column.align === "right" && "text-right", column.className)} key={column.key} scope="col">
                    {column.sort ? (
                      <button className={cn("inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground", column.align === "right" && "flex-row-reverse", active && "text-foreground")} onClick={() => toggle(column.key)} type="button">
                        {column.label}
                        {active ? sort.direction === "asc" ? <CaretUp className="h-3 w-3" weight="bold" /> : <CaretDown className="h-3 w-3" weight="bold" /> : <span className="h-3 w-3" />}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, limit).map((row) => (
              <tr
                className={cn("transition-colors", onRowClick && "cursor-pointer hover:bg-primary-soft/50 focus-visible:bg-primary-soft/50 focus-visible:outline-none")}
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => (event.key === "Enter" || event.key === " ") && (event.preventDefault(), onRowClick(row)) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td className={cn("border-b border-border/70 px-3 py-2.5 align-middle tabular-nums text-foreground", column.align === "right" && "text-right", column.className)} key={column.key}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > limit ? (
        <button className="mt-3 cursor-pointer text-sm font-semibold text-primary transition-colors hover:text-primary-hover" onClick={() => setLimit((value) => value + pageSize)} type="button">
          Xem thêm {Math.min(pageSize, sorted.length - limit)} / còn {sorted.length - limit} dòng
        </button>
      ) : null}
    </div>
  );
}

/** Thanh tỷ lệ nhỏ trong ô bảng (0–100) kèm số; giá trị null hiện gạch ngang. */
export function RateCell({ value, color = "var(--viz-1)" }: { value: number | null; color?: string }) {
  if (value === null) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-2">
        <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
      </span>
      <span className="w-12 text-right font-medium">{new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value)}%</span>
    </span>
  );
}
