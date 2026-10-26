"use client";

import type { ReactNode } from "react";
import type { RouteConfig } from "@/config/routes/routes";
import { cn } from "@/lib/utils";
import { columnLabels, ResourceCell } from "./resource-format";
import { getResourceId } from "./resource-actions";
import type { ScoreEntry } from "./score-entry";

type Row = Record<string, unknown>;
type Selection = { selectedIds: string[]; selectableIds: string[]; onToggle: (id: string) => void; onToggleAll: (on: boolean) => void };

// Cột nào nên làm tiêu đề của thẻ (ưu tiên cột nhận diện), cột trạng thái thì hiện dạng nhãn ở góc thẻ.
const TITLE_COLUMNS = ["fullName", "leaderFullName", "courseName", "name", "title", "roleName", "username", "certificateCode", "code"];
const BADGE_COLUMN = /status|result|passed|locked|validity/i;

export function splitCardColumns(columns: string[]) {
  const visible = columns.filter((column) => column !== "imageUrl");
  const title = TITLE_COLUMNS.find((column) => visible.includes(column)) ?? visible.find((column) => !BADGE_COLUMN.test(column)) ?? visible[0];
  const badges = visible.filter((column) => column !== title && BADGE_COLUMN.test(column));
  const details = visible.filter((column) => column !== title && !badges.includes(column));
  return { title, badges, details };
}

// Dạng thẻ của bảng dữ liệu dùng chung cho tablet dọc và điện thoại (dưới 1024px, nơi bảng rộng phải cuộn ngang):
// mỗi dòng là một thẻ gồm tiêu đề, nhãn trạng thái, các trường dạng "nhãn: giá trị" và thao tác với vùng chạm 44px.
// Dữ liệu, ô nhập (điểm, tên đội), chọn nhiều và thao tác giữ nguyên như bảng; chỉ khác bố cục.
export function ResourceCardList({
  columns,
  route,
  rows,
  isLoading,
  size,
  selection,
  scoreEntry,
  cellEditors,
  indexOffset,
  renderActions,
  renderIdentity,
}: {
  columns: string[];
  route: RouteConfig;
  rows: Row[];
  isLoading: boolean;
  size: number;
  selection?: Selection;
  scoreEntry?: ScoreEntry;
  cellEditors?: Record<string, (row: Row) => ReactNode>;
  indexOffset?: number;
  renderActions: (row: Row) => ReactNode;
  renderIdentity?: (row: Row) => ReactNode;
}) {
  const { title, badges, details } = splitCardColumns(columns);
  const leaders = route.kind === "leaders" && Boolean(renderIdentity);

  if (isLoading) {
    return (
      <ul aria-busy className="grid gap-3 p-3 sm:p-4 md:grid-cols-2">
        {Array.from({ length: Math.min(size, 6) }).map((_, index) => (
          <li className="space-y-3 rounded-xl border border-border bg-white p-4" key={index}>
            <span className="block h-4 w-2/3 rounded bg-surface-2 motion-safe:animate-pulse" />
            <span className="block h-3 w-1/2 rounded bg-surface-2 motion-safe:animate-pulse" />
            <span className="block h-3 w-3/4 rounded bg-surface-2 motion-safe:animate-pulse" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      {selection && selection.selectableIds.length > 0 ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border bg-slate-50 px-4 text-sm font-medium text-text-secondary">
          <input
            aria-label="Chọn tất cả hồ sơ đang chờ duyệt"
            checked={selection.selectableIds.every((id) => selection.selectedIds.includes(id))}
            className="h-5 w-5 accent-primary"
            onChange={(event) => selection.onToggleAll(event.target.checked)}
            type="checkbox"
          />
          Chọn tất cả hồ sơ có thể xử lý
        </label>
      ) : null}
      <ul className="grid gap-3 p-3 sm:p-4 md:grid-cols-2">
        {rows.map((row, rowIndex) => {
          const rowId = getResourceId(route, row);
          const selectable = Boolean(selection && rowId && selection.selectableIds.includes(rowId));
          return (
            <li
              className={cn(
                "flex min-w-0 flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition-colors",
                selectable && rowId && selection?.selectedIds.includes(rowId) ? "border-primary/50 bg-primary-soft/30" : "border-border",
              )}
              key={String(row.id ?? row.username ?? row.certificateCode ?? rowIndex)}
            >
              <div className="flex items-start gap-3">
                {selectable && rowId && selection ? (
                  <input
                    aria-label="Chọn hồ sơ"
                    checked={selection.selectedIds.includes(rowId)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                    onChange={() => selection.onToggle(rowId)}
                    type="checkbox"
                  />
                ) : null}
                {indexOffset !== undefined ? <span className="mt-0.5 shrink-0 text-xs font-semibold text-muted">#{indexOffset + rowIndex + 1}</span> : null}
                <div className="min-w-0 flex-1 text-[15px] font-semibold leading-6 text-foreground">
                  {leaders && renderIdentity ? renderIdentity(row) : cellEditors?.[title] ? cellEditors[title](row) : <ResourceCell column={title} displayMode="detail" row={row} value={row[title]} />}
                </div>
              </div>
              {badges.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {badges.map((column) => (
                    <ResourceCell column={column} displayMode="detail" key={column} row={row} value={row[column]} />
                  ))}
                </div>
              ) : null}
              {details.length > 0 || (scoreEntry?.components.length ?? 0) > 0 ? (
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 text-sm min-[420px]:grid-cols-2">
                  {details
                    .filter((column) => !(leaders && column === "holyName"))
                    .map((column) => (
                      <div className="min-w-0" key={column}>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{columnLabels[column] ?? column}</dt>
                        <dd className="mt-0.5 min-w-0 text-foreground [overflow-wrap:anywhere]">
                          {cellEditors?.[column] ? cellEditors[column](row) : <ResourceCell column={column} displayMode="detail" row={row} value={row[column]} />}
                        </dd>
                      </div>
                    ))}
                  {scoreEntry?.components.map((component) => {
                    const value = rowId ? scoreEntry.valueOf(rowId, row, component.id) : "";
                    const editable = Boolean(rowId) && scoreEntry.isEditable(row);
                    const invalid = scoreEntry.isInvalid(component, value);
                    return (
                      <div className="min-w-0" key={component.id}>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                          {component.name} <span className="font-normal normal-case text-muted">/ {Number(component.maxScore)}</span>
                        </dt>
                        <dd className="mt-0.5">
                          {editable && rowId ? (
                            <input
                              aria-label={`${component.name} của ${String(row.leaderFullName ?? "")}`}
                              className={cn(
                                "h-11 w-full rounded-lg border bg-white px-3 text-base focus:outline-none focus:ring-2",
                                invalid ? "border-danger focus:ring-danger/30" : "border-border focus:border-primary focus:ring-primary/20",
                              )}
                              inputMode="decimal"
                              max={Number(component.maxScore)}
                              min={0}
                              onChange={(event) => scoreEntry.onChange(rowId, row, component.id, event.target.value)}
                              step="0.01"
                              type="number"
                              value={value}
                            />
                          ) : (
                            <span>{value === "" ? "—" : value}</span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : null}
              <div className="-mx-1 flex flex-wrap items-center justify-end gap-1 border-t border-slate-100 pt-2.5 [&_a[aria-label]:not([data-switch])]:h-11 [&_a[aria-label]:not([data-switch])]:min-w-11 [&_button]:min-h-11 [&_button]:min-w-11">
                {renderActions(row)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
