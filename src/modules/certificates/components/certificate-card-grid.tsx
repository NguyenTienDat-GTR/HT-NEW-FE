"use client";

import { fillRoute, getResourceId } from "@/components/common/resource/resource-actions";
import type { CardViewProps } from "@/components/common/resource/resource-list-types";
import { RowActions } from "@/components/common/resource/resource-table";
import { CertificateCard, type CertificateCardData } from "./certificate-card";

export function CertificateCardGrid({ rows, route, isLoading, selection, onExportRow, exportingRow }: CardViewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="h-[260px] rounded-xl border border-border bg-slate-50 motion-safe:animate-pulse" key={index} />
        ))}
      </div>
    );
  }
  const total = selection?.selectableIds.length ?? 0;
  const selectedCount = selection ? selection.selectableIds.filter((id) => selection.selectedIds.includes(id)).length : 0;
  const allSelected = total > 0 && selectedCount === total;
  return (
    <div>
      {selection ? (
        // Giống ô chọn tất cả ở đầu bảng: chọn / bỏ chọn mọi chứng nhận có thể chọn.
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-slate-50 px-5 py-3">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
            <input
              aria-label="Chọn tất cả chứng nhận"
              checked={allSelected}
              className="h-4 w-4 cursor-pointer accent-primary"
              disabled={total === 0}
              onChange={(event) => selection.onToggleAll(event.target.checked)}
              ref={(element) => {
                if (element) element.indeterminate = selectedCount > 0 && !allSelected;
              }}
              type="checkbox"
            />
            Chọn tất cả
          </label>
          <span className="text-[13px] text-text-secondary">
            {selectedCount > 0 ? `Đã chọn ${selectedCount}/${total} chứng nhận` : `${total} chứng nhận có thể chọn`}
          </span>
          {selectedCount > 0 ? (
            <button className="cursor-pointer text-[13px] font-semibold text-primary hover:text-primary-hover" onClick={() => selection.onToggleAll(false)} type="button">
              Bỏ chọn
            </button>
          ) : null}
        </div>
      ) : null}
    <ul className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((row, index) => {
        const id = getResourceId(route, row);
        // Giống nút "Xem chi tiết" ở chế độ bảng: trang chi tiết nếu route có, không thì mở drawer.
        const href = id ? (fillRoute(route.detailPath, { id }) ?? `${route.path}?detail=${encodeURIComponent(id)}`) : undefined;
        const selectable = Boolean(selection && id && selection.selectableIds.includes(id));
        return (
          <li key={id ?? index}>
            <CertificateCard
              data={row as CertificateCardData}
              footer={<RowActions exportingRow={exportingRow} onExportRow={onExportRow} route={route} row={row} />}
              href={href}
              selection={selectable && id && selection ? { checked: selection.selectedIds.includes(id), onToggle: () => selection.onToggle(id) } : undefined}
            />
          </li>
        );
      })}
    </ul>
    </div>
  );
}
