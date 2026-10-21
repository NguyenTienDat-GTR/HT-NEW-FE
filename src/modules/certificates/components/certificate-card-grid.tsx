"use client";

import { fillRoute, getResourceId } from "@/components/common/resource/resource-actions";
import type { CardViewProps } from "@/components/common/resource/resource-list-types";
import { RowActions } from "@/components/common/resource/resource-table";
import { CertificateCard, type CertificateCardData } from "./certificate-card";

export function CertificateCardGrid({ rows, route, isLoading, selection, onExportRow, exportingRow }: CardViewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="h-[260px] rounded-xl border border-border bg-slate-50 motion-safe:animate-pulse" key={index} />
        ))}
      </div>
    );
  }
  return (
    <ul className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
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
  );
}
